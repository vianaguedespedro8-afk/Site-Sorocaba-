(function(){
  'use strict';
  var C = window.EVENT_CONFIG || {};
  var E = C.EVENT || {};
  var $ = function(s){ return document.querySelector(s); };
  var $$ = function(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var modal = $('#community-modal');
  var form = $('#lead-form');
  var success = $('#success');
  var submitBtn = $('#submit-lead');
  var community = C.COMMUNITY_URL || '#';
  var leadOrigin = 'automatico';

  $('#manual-community').href = community;

  function qs(){
    var p = new URLSearchParams(location.search);
    return {
      utm_source:p.get('utm_source')||'direto',
      utm_medium:p.get('utm_medium')||'',
      utm_campaign:p.get('utm_campaign')||'',
      utm_content:p.get('utm_content')||'',
      utm_term:p.get('utm_term')||''
    };
  }

  function id(){
    try {
      return crypto.randomUUID
        ? crypto.randomUUID()
        : 'evt-'+Date.now()+'-'+Math.random().toString(16).slice(2);
    } catch(e){
      return 'evt-'+Date.now()+'-'+Math.random().toString(16).slice(2);
    }
  }

  function digits(v){
    return String(v||'').replace(/\D/g,'');
  }

  function normalizePhone(v){
    var d=digits(v);
    if(d.length===10 || d.length===11) d='55'+d;
    return d;
  }

  function phoneOk(v){
    var d=digits(v);
    return d.length===10 || d.length===11 || d.length===12 || d.length===13;
  }

  function fmtPhone(el){
    var d=digits(el.value).slice(0,11);

    if(d.length<=2)
      el.value=d;
    else if(d.length<=6)
      el.value='('+d.slice(0,2)+') '+d.slice(2);
    else if(d.length<=10)
      el.value='('+d.slice(0,2)+') '+d.slice(2,6)+'-'+d.slice(6);
    else
      el.value='('+d.slice(0,2)+') '+d.slice(2,7)+'-'+d.slice(7);
  }

  $('#whatsapp').addEventListener('input',function(){
    fmtPhone(this);
  });

  function openModal(origin){
    leadOrigin=origin||'automatico';

    modal.hidden=false;
    modal.setAttribute('aria-hidden','false');

    document.body.style.overflow='hidden';

    setTimeout(function(){
      $('#nome').focus();
    },80);
  }

  function closeModal(){
    modal.hidden=true;
    modal.setAttribute('aria-hidden','true');

    document.body.style.overflow='';

    maybeCookie();
  }

  $$('.js-open').forEach(function(b){
    b.addEventListener('click',function(){
      openModal(b.dataset.origin||'botao');
    });
  });

  $$('.js-close').forEach(function(b){
    b.addEventListener('click',closeModal);
  });

  document.addEventListener('keydown',function(e){
    if(e.key==='Escape' && !modal.hidden)
      closeModal();
  });

  setTimeout(function(){
    if(modal.hidden)
      openModal('popup');
  }, Number(C.POPUP_DELAY_MS||350));

  function buildPayload(stage, common, extra){
    return Object.assign(
      {},
      common,
      extra||{},
      {
        etapa:stage,
        data_hora:new Date().toISOString(),
        pagina:location.href,
        referrer:document.referrer||'',
        user_agent:navigator.userAgent,
        origem_botao:leadOrigin
      },
      qs()
    );
  }

  function send(payload){
    if(!C.LEADS_ENDPOINT)
      return Promise.resolve();

    try{
      return fetch(C.LEADS_ENDPOINT,{
        method:'POST',
        mode:'no-cors',
        keepalive:true,
        headers:{
          'Content-Type':'text/plain;charset=utf-8'
        },
        body:JSON.stringify(payload)
      }).catch(function(){});
    } catch(e){
      return Promise.resolve();
    }
  }

  function track(name,data){
    if(localStorage.getItem('medicao_evento')!=='sim')
      return;

    window.dataLayer=window.dataLayer||[];

    window.dataLayer.push(
      Object.assign(
        {event:name},
        data||{}
      )
    );
  }

  form.addEventListener('submit',function(e){
    e.preventDefault();

    var name=$('#nome').value.trim();
    var phone=$('#whatsapp').value;
    var consent=$('#consentimento').checked;

    var bad=false;

    var nameField=$('#nome').closest('.field');
    var phoneField=$('#whatsapp').closest('.field');

    nameField.classList.toggle('bad',name.length<2);
    phoneField.classList.toggle('bad',!phoneOk(phone));

    $('.err-consent').classList.toggle('show',!consent);

    bad=
      name.length<2 ||
      !phoneOk(phone) ||
      !consent;

    if(bad)
      return;

    submitBtn.disabled=true;
    submitBtn.textContent='Cadastrando...';

    var uid=id();

    var common={
      id:uid,
      nome:name,
      whatsapp:normalizePhone(phone),
      consentimento:true,
      uf:E.uf||'SP',
      cidade:E.city||'Sorocaba',
      regiao:E.region||'sorocaba',
      grupo:community
    };

    var cadastro=buildPayload(
      'cadastro',
      common,
      {
        event_id:uid+'-cadastro'
      }
    );

    var local=buildPayload(
      'local',
      common,
      {
        event_id:uid+'-local'
      }
    );

    track('cadastro_evento',{
      cidade:common.cidade,
      origem_botao:leadOrigin
    });

    Promise.allSettled([
      send(cadastro),
      send(local)
    ]).finally(function(){

      form.hidden=true;
      success.hidden=false;

      track('entrou_grupo',{
        cidade:common.cidade,
        grupo:community
      });

      setTimeout(function(){
        location.href=community;
      },450);
    });
  });

  // Contagem regressiva no horário de São Paulo (-03:00)
  var first=new Date(
    E.firstStart||'2026-09-26T09:30:00-03:00'
  ).getTime();

  var second=new Date(
    E.secondStart||'2026-09-26T14:30:00-03:00'
  ).getTime();

  var end=new Date(
    E.end||'2026-09-26T18:00:00-03:00'
  ).getTime();

  function two(n){
    return String(
      Math.max(0,n)
    ).padStart(2,'0');
  }

  function tick(){

    var now=Date.now();
    var target;
    var label;
    var targetText;

    if(now<first){

      target=first;
      label='FALTA POUCO PARA O PRIMEIRO ENCONTRO';
      targetText='09h30 • Praça da Catedral';

    } else if(now<second){

      target=second;
      label='PRÓXIMO ENCONTRO EM';
      targetText='14h30 • Parque Vitória Régia';

    } else if(now<end){

      $('#countdown').hidden=true;
      $('#count-finished').hidden=false;

      $('#count-label').textContent='EVENTO EM ANDAMENTO';
      $('#count-target').textContent='14h30 • Parque Vitória Régia';

      $('#count-finished').textContent=
        'A programação de hoje já começou.';

      return;

    } else {

      $('#countdown').hidden=true;
      $('#count-finished').hidden=false;

      $('#count-label').textContent='PROGRAMAÇÃO DE 26/09';
      $('#count-target').textContent='Sorocaba • SP';

      $('#count-finished').textContent=
        'A agenda deste sábado foi concluída.';

      return;
    }

    $('#countdown').hidden=false;
    $('#count-finished').hidden=true;

    $('#count-label').textContent=label;
    $('#count-target').textContent=targetText;

    var diff=Math.max(0,target-now);

    var days=Math.floor(diff/86400000);

    diff%=86400000;

    var hrs=Math.floor(diff/3600000);

    diff%=3600000;

    var min=Math.floor(diff/60000);

    diff%=60000;

    var sec=Math.floor(diff/1000);

    $('#cd-d').textContent=two(days);
    $('#cd-h').textContent=two(hrs);
    $('#cd-m').textContent=two(min);
    $('#cd-s').textContent=two(sec);
  }

  tick();
  setInterval(tick,1000);

  // GTM somente após consentimento
  var cookie=$('#cookie');

  function loadGTM(){

    if(
      !C.GTM_ID ||
      window.__eventGtmLoaded
    )
      return;

    window.__eventGtmLoaded=true;

    window.dataLayer=
      window.dataLayer||[];

    window.dataLayer.push({
      'gtm.start':Date.now(),
      event:'gtm.js'
    });

    var s=document.createElement('script');

    s.async=true;

    s.src=
      'https://www.googletagmanager.com/gtm.js?id='+
      encodeURIComponent(C.GTM_ID);

    document.head.appendChild(s);
  }

  function maybeCookie(){

    var v=
      localStorage.getItem('medicao_evento');

    if(v==='sim')
      loadGTM();
    else if(v!=='nao')
      cookie.hidden=false;
  }

  $('#cookie-yes').addEventListener(
    'click',
    function(){

      localStorage.setItem(
        'medicao_evento',
        'sim'
      );

      cookie.hidden=true;

      loadGTM();
    }
  );

  $('#cookie-no').addEventListener(
    'click',
    function(){

      localStorage.setItem(
        'medicao_evento',
        'nao'
      );

      cookie.hidden=true;
    }
  );

  if(
    localStorage.getItem('medicao_evento')
      ==='sim'
  ){
    loadGTM();
  }

})();
