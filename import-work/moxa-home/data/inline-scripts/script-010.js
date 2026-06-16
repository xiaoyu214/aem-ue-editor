if(sessionStorage.getItem("quotationBag") =="" || sessionStorage.getItem("quotationBag") ===null)
      document.getElementsByClassName('header__bag-note')[0].style.dispay = 'none'; 
    else document.getElementsByClassName('header__bag-note')[0].style.display = 'block';