(function () {
  'use strict';

  var C = window.EVENT_CONFIG || {};
  var E = C.EVENT || {};
  var $ = function (s, root) { return (root || document).querySelector(s); };
  var $$ = function (s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); };

  var modal = $('#community-modal');
  var cookie = $('#cookie');
  var progress = $('#progress-bar');
  var steps = {
    1: $('#step1'),
    2: $('#step2'),
    3: $('#step3'),
    4: $('#step4')
  };

  var current = 1;
  var origin = 'popup';
  var community = C.COMMUNITY_URL || '#';
  var measurement = null;

  try {
    measurement = localStorage.getItem('medicao_evento');
  } catch (e) {}

  var lead = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    nome: '',
    whatsapp: '',
    consentimento: false,
    uf: '',
    cidade: '',
    regiao: '',
    grupo: community
  };

  function two(n) {
    return String(Math.max(0, n)).padStart(2, '0');
  }

  function paramsObj() {
    var p = new URLSearchParams(location.search);

    return {
      utm_source: p.get('utm_source') || 'direto',
      utm_medium: p.get('utm_medium') || '',
      utm_campaign: p.get('utm_campaign') || '',
      utm_content: p.get('utm_content') || '',
      utm_term: p.get('utm_term') || '',
      fbclid: p.get('fbclid') || ''
    };
  }

  var utm = paramsObj();

  function eventId(stage) {
    return stage === 'local'
      ? lead.id + '-local'
      : lead.id;
  }

  function readCookie(name) {
    var m = document.cookie.match('(^|; )' + name + '=([^;]*)');
    return m ? decodeURIComponent(m[2]) : '';
  }

  function fbc() {
    var c = readCookie('_fbc');

    if (c) return c;

    return utm.fbclid
      ? 'fb.1.' + Date.now() + '.' + utm.fbclid
      : '';
  }

  function payload(stage) {
    return Object.assign({}, lead, utm, {
      etapa: stage,
      pagina: location.href,
      data_hora: new Date().toISOString(),
      event_id: eventId(stage),
      regiao: regionFor(lead.cidade || ''),
      fbp: readCookie('_fbp'),
      fbc: fbc(),
      user_agent: navigator.userAgent,
      origem_botao: origin
    });
  }

  // Envia os dados sem travar o formulário.
  function send(stage) {
    if (!C.LEADS_ENDPOINT) return;

    try {
      fetch(C.LEADS_ENDPOINT, {
        method: 'POST',
        keepalive: true,
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload(stage))
      }).catch(function () {});
    } catch (e) {}
  }

  function loadTracking() {
    if (C.GTM_ID && !window.__sorocabaGtm) {
      window.__sorocabaGtm = true;
      window.dataLayer = window.dataLayer || [];

      window.dataLayer.push({
        'gtm.start': Date.now(),
        event: 'gtm.js'
      });

      var s = document.createElement('script');

      s.async = true;
      s.src =
        'https://www.googletagmanager.com/gtm.js?id=' +
        encodeURIComponent(C.GTM_ID);

      document.head.appendChild(s);
    }

    if (C.META_PIXEL_ID && !window.fbq) {
      !function(f,b,e,v,n,t,s){
        if(f.fbq)return;
        n=f.fbq=function(){
          n.callMethod
            ? n.callMethod.apply(n,arguments)
            : n.queue.push(arguments)
        };
        if(!f._fbq)f._fbq=n;
        n.push=n;
        n.loaded=!0;
        n.version='2.0';
        n.queue=[];
        t=b.createElement(e);
        t.async=!0;
        t.src=v;
        s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)
      }(
        window,
        document,
        'script',
        'https://connect.facebook.net/en_US/fbevents.js'
      );

      window.fbq('init', C.META_PIXEL_ID);
      window.fbq('track', 'PageView');
    }
  }

  function track(ev, data) {
    if (measurement !== 'sim') return;

    window.dataLayer = window.dataLayer || [];

    window.dataLayer.push(
      Object.assign(
        { event: ev },
        data || {}
      )
    );

    var legacy = {
      cadastro: 'lead',
      entrou_grupo: 'entrar_grupo'
    };

    if (legacy[ev]) {
      window.dataLayer.push({
        event: legacy[ev],
        municipio: lead.cidade || '',
        regiao: lead.regiao || '',
        grupo: lead.grupo || '',
        botao: 'site'
      });
    }

    if (window.fbq) {
      var map = {
        abrir_formulario: 'InitiateCheckout',
        cadastro: 'Lead',
        entrou_grupo: 'CompleteRegistration'
      };

      if (map[ev]) {
        var kind = {
          cadastro: 'cadastro',
          entrou_grupo: 'local'
        }[ev];

        if (kind) {
          window.fbq(
            'track',
            map[ev],
            {},
            { eventID: eventId(kind) }
          );
        } else {
          window.fbq('track', map[ev]);
        }
      }
    }
  }

  if (measurement === 'sim') {
    loadTracking();
  }

  function maybeCookie() {
    if (
      measurement === null &&
      modal &&
      modal.hidden &&
      cookie
    ) {
      cookie.hidden = false;
    }
  }

  if ($('#cookie-yes')) {
    $('#cookie-yes').addEventListener('click', function () {
      measurement = 'sim';

      try {
        localStorage.setItem('medicao_evento', 'sim');
      } catch (e) {}

      cookie.hidden = true;
      loadTracking();
    });
  }

  if ($('#cookie-no')) {
    $('#cookie-no').addEventListener('click', function () {
      measurement = 'nao';

      try {
        localStorage.setItem('medicao_evento', 'nao');
      } catch (e) {}

      cookie.hidden = true;
    });
  }

  function go(n) {
    Object.keys(steps).forEach(function (k) {
      if (steps[k]) {
        steps[k].classList.toggle(
          'is-active',
          +k === n
        );
      }
    });

    if (progress) {
      progress.style.width = (n * 25) + '%';
    }

    current = n;
  }

  function openModal(from) {
    origin = from || 'botao';

    if (cookie) {
      cookie.hidden = true;
    }

    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');

    document.body.style.overflow = 'hidden';

    go(current === 4 ? 4 : current);

    track('abrir_formulario', {
      origem: origin
    });
  }

  function closeModal() {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');

    document.body.style.overflow = '';

    maybeCookie();
  }

  document.addEventListener('click', function (e) {
    var o = e.target.closest('.js-open');

    if (o) {
      e.preventDefault();

      openModal(
        o.getAttribute('data-origin') || 'botao'
      );

      return;
    }

    var c = e.target.closest('.js-close');

    if (c) {
      e.preventDefault();
      closeModal();
      return;
    }

    var b = e.target.closest('.js-back');

    if (b) {
      e.preventDefault();

      if (current === 3) {
        go(2);
      } else {
        go(1);
      }
    }
  });

  document.addEventListener('keydown', function (e) {
    if (
      e.key === 'Escape' &&
      !modal.hidden
    ) {
      closeModal();
    }
  });

  // Abre quase instantaneamente.
  setTimeout(function () {
    if (modal && modal.hidden) {
      openModal('popup');
    }
  }, Number(
    C.POPUP_DELAY_MS == null
      ? 50
      : C.POPUP_DELAY_MS
  ));

  // Máscara de telefone
  var tel = $('#whatsapp');

  if (tel) {
    tel.addEventListener('input', function () {
      var d = tel.value
        .replace(/\D/g, '')
        .replace(/^55(?=\d{10,11}$)/, '')
        .slice(0, 11);

      var out = d;

      if (d.length > 2) {
        out =
          '(' +
          d.slice(0, 2) +
          ') ' +
          d.slice(2);
      }

      if (d.length > 7) {
        out =
          '(' +
          d.slice(0, 2) +
          ') ' +
          d.slice(2, d.length - 4) +
          '-' +
          d.slice(-4);
      }

      tel.value = out;
    });
  }

  function validPhone(v) {
    var d = String(v || '')
      .replace(/\D/g, '');

    if (
      d.length !== 10 &&
      d.length !== 11
    ) {
      return false;
    }

    if (+d.slice(0, 2) < 11) {
      return false;
    }

    if (
      d.length === 11 &&
      d[2] !== '9'
    ) {
      return false;
    }

    return !/^(\d)\1+$/.test(
      d.slice(2)
    );
  }

  // PASSO 1
  if (steps[1]) {
    steps[1].addEventListener(
      'submit',
      function (e) {
        e.preventDefault();

        var f = steps[1];

        var nome = f.nome.value
          .trim()
          .replace(/\s+/g, ' ');

        var nomeOk =
          nome.length >= 2 &&
          /[a-zà-ú]/i.test(nome);

        var telOk =
          validPhone(
            f.whatsapp.value
          );

        f.nome
          .closest('.field')
          .classList
          .toggle('bad', !nomeOk);

        f.whatsapp
          .closest('.field')
          .classList
          .toggle('bad', !telOk);

        var chk =
          f.consentimento.checked;

        var err =
          $('.err-check', f);

        if (err) {
          err.classList.toggle(
            'show',
            !chk
          );
        }

        var ok =
          nomeOk &&
          telOk &&
          chk;

        if (!ok) return;

        lead.nome = nome;

        lead.whatsapp =
          '55' +
          f.whatsapp.value
            .replace(/\D/g, '');

        lead.consentimento = true;

        send('cadastro');
        track('cadastro');

        // avança na hora
        go(2);
      }
    );
  }

  // PASSO 2 - ESTADO
  var UFS = [
    ['AC','Acre'],
    ['AL','Alagoas'],
    ['AP','Amapá'],
    ['AM','Amazonas'],
    ['BA','Bahia'],
    ['CE','Ceará'],
    ['DF','Distrito Federal'],
    ['ES','Espírito Santo'],
    ['GO','Goiás'],
    ['MA','Maranhão'],
    ['MT','Mato Grosso'],
    ['MS','Mato Grosso do Sul'],
    ['MG','Minas Gerais'],
    ['PA','Pará'],
    ['PB','Paraíba'],
    ['PR','Paraná'],
    ['PE','Pernambuco'],
    ['PI','Piauí'],
    ['RJ','Rio de Janeiro'],
    ['RN','Rio Grande do Norte'],
    ['RS','Rio Grande do Sul'],
    ['RO','Rondônia'],
    ['RR','Roraima'],
    ['SC','Santa Catarina'],
    ['SP','São Paulo'],
    ['SE','Sergipe'],
    ['TO','Tocantins']
  ];

  var ufSel = $('#uf');

  if (ufSel) {
    UFS.forEach(function (u) {
      var o =
        document.createElement('option');

      o.value = u[0];
      o.textContent = u[1];

      ufSel.appendChild(o);
    });

    if (C.UF_PADRAO) {
      ufSel.value =
        C.UF_PADRAO;
    }
  }

  if (steps[2]) {
    steps[2].addEventListener(
      'submit',
      function (e) {
        e.preventDefault();

        if (!ufSel.value) {
          ufSel
            .closest('.field')
            .classList
            .add('bad');

          return;
        }

        ufSel
          .closest('.field')
          .classList
          .remove('bad');

        lead.uf =
          ufSel.value;

        $('#uf-name').textContent =
          ufSel.options[
            ufSel.selectedIndex
          ].text;

        go(3);

        loadCities(
          lead.uf
        );
      }
    );
  }

  // PASSO 3 - CIDADE
  var cityCache = {};
  var cityList = [];
  var q = $('#city-q');
  var ul = $('#cities');
  var count = $('#city-count');

  var norm = function (s) {
    return String(s || '')
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .toLowerCase();
  };

  function loadCities(uf) {
    q.value = '';
    ul.innerHTML = '';
    count.textContent =
      'Carregando cidades…';

    if (cityCache[uf]) {
      cityList =
        cityCache[uf];

      renderCities();
      return;
    }

    fetch(
      'https://servicodados.ibge.gov.br/api/v1/localidades/estados/' +
      encodeURIComponent(uf) +
      '/municipios?orderBy=nome'
    )
      .then(function (r) {
        if (!r.ok) throw 0;
        return r.json();
      })
      .then(function (d) {
        cityList =
          d.map(function (c) {
            return c.nome;
          })
          .sort(function (a, b) {
            return a.localeCompare(
              b,
              'pt-BR'
            );
          });

        cityCache[uf] =
          cityList;

        renderCities();
      })
      .catch(function () {
        cityList = [];

        count.textContent =
          'Não foi possível carregar as cidades. Volte e tente novamente.';
      });
  }

  function renderCities() {
    var term =
      norm(q.value);

    var list =
      cityList.filter(
        function (c) {
          return (
            !term ||
            norm(c).indexOf(term) !== -1
          );
        }
      );

    ul.innerHTML = '';

    list.forEach(function (city) {
      var li =
        document.createElement('li');

      var b =
        document.createElement('button');

      b.type = 'button';
      b.textContent = city;

      b.addEventListener(
        'click',
        function () {
          chooseCity(city);
        }
      );

      li.appendChild(b);
      ul.appendChild(li);
    });

    count.textContent =
      list.length +
      ' cidade' +
      (
        list.length === 1
          ? ''
          : 's'
      );
  }

  if (q) {
    q.addEventListener(
      'input',
      renderCities
    );
  }

  function regionFor(city) {
    if (
      lead.uf === 'SP' &&
      city === 'Sorocaba'
    ) {
      return 'sorocaba';
    }

    return '';
  }

  function chooseCity(city) {
    lead.cidade = city;
    lead.regiao =
      regionFor(city);

    lead.grupo =
      community;

    send('local');

    track(
      'entrou_grupo',
      {
        cidade:
          lead.cidade,

        uf:
          lead.uf,

        grupo:
          lead.grupo
      }
    );

    if ($('#go-group')) {
      $('#go-group').href =
        lead.grupo;
    }

    go(4);

    setTimeout(function () {
      window.location.href =
        lead.grupo;
    }, 350);
  }

  // CONTAGEM REGRESSIVA
  var first = Date.parse(
    E.firstStart ||
    '2026-09-26T09:30:00-03:00'
  );

  var second = Date.parse(
    E.secondStart ||
    '2026-09-26T14:30:00-03:00'
  );

  var end = Date.parse(
    E.end ||
    '2026-09-26T18:00:00-03:00'
  );

  function renderCountdown() {
    var now = Date.now();
    var target;
    var label;
    var text;

    var countdown =
      $('#countdown');

    var finished =
      $('#count-finished');

    if (now < first) {
      target = first;
      label =
        'FALTA PARA O PRIMEIRO ENCONTRO';

      text =
        '09h30 • Praça da Catedral';
    }

    else if (now < second) {
      target = second;

      label =
        'FALTA PARA O SEGUNDO ENCONTRO';

      text =
        '14h30 • Parque Vitória Régia';
    }

    else if (now < end) {
      countdown.hidden = true;
      finished.hidden = false;

      $('#count-label')
        .textContent =
        'EVENTO EM ANDAMENTO';

      $('#count-target')
        .textContent =
        'Parque Vitória Régia • Sorocaba';

      finished.textContent =
        'A programação de hoje já começou.';

      return;
    }

    else {
      countdown.hidden = true;
      finished.hidden = false;

      $('#count-label')
        .textContent =
        'PROGRAMAÇÃO ENCERRADA';

      $('#count-target')
        .textContent =
        'Sorocaba • 26/09';

      finished.textContent =
        'A programação deste sábado foi concluída.';

      return;
    }

    countdown.hidden = false;
    finished.hidden = true;

    $('#count-label')
      .textContent = label;

    $('#count-target')
      .textContent = text;

    var diff =
      Math.max(
        0,
        target - now
      );

    var d =
      Math.floor(
        diff / 86400000
      );

    diff %= 86400000;

    var h =
      Math.floor(
        diff / 3600000
      );

    diff %= 3600000;

    var m =
      Math.floor(
        diff / 60000
      );

    diff %= 60000;

    var sec =
      Math.floor(
        diff / 1000
      );

    $('#cd-d').textContent =
      two(d);

    $('#cd-h').textContent =
      two(h);

    $('#cd-m').textContent =
      two(m);

    $('#cd-s').textContent =
      two(sec);
  }

  renderCountdown();

  setInterval(
    renderCountdown,
    1000
  );
})();
