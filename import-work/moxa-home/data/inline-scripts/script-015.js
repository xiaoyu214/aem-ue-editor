//<![CDATA[

var Page_ValidationActive = false;
if (typeof(ValidatorOnLoad) == "function") {
    ValidatorOnLoad();
}

function ValidatorOnSubmit() {
    if (Page_ValidationActive) {
        return ValidatorCommonOnSubmit();
    }
    else {
        return true;
    }
}
        
document.getElementById('p_lt_ctl03_MoxaSearch_rvTextIsRequired').dispose = function() {
    Array.remove(Page_Validators, document.getElementById('p_lt_ctl03_MoxaSearch_rvTextIsRequired'));
}
//]]>