window.addEventListener('DOMContentLoaded', function (e) {
      if (checkIfIE()) {
        var message = document.querySelector('.ie-warning');
        
        if (message) {
          message.classList.remove('hide');
          syncHeaderPosWithMessageHeight(message);
          window.addEventListener('resize', function (e) {
            syncHeaderPosWithMessageHeight(message);
          });
        }
      }
    })
      function syncHeaderPosWithMessageHeight(message) {
        var header = document.querySelector('header');
        var messageHeight = message.clientHeight;
        if (header) {
          if(window.matchMedia('(max-width: 1024px)').matches) {
            header.style.top = messageHeight + 'px';
          } else {
            header.style.top = '';
          }
        }
      }
    function checkIfIE() {
      var ua = window.navigator.userAgent;
      var msie = ua.indexOf("MSIE ");
      
      return msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./);
    }