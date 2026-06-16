//<![CDATA[

theForm.oldSubmit = theForm.submit;
theForm.submit = WebForm_SaveScrollPositionSubmit;

theForm.oldOnSubmit = theForm.onsubmit;
theForm.onsubmit = WebForm_SaveScrollPositionOnSubmit;
Sys.Application.add_init(function() {
    $create(Sys.UI._UpdateProgress, {"associatedUpdatePanelId":"p_lt_ctl06_MoxaGenericContainer_MoxaGenericContainer_zone_MoxaNewsletterSubscriptionWidget_upPanel","displayAfter":500,"dynamicLayout":true}, null, null, $get("p_lt_ctl06_MoxaGenericContainer_MoxaGenericContainer_zone_MoxaNewsletterSubscriptionWidget_UpdateProgress"));
});
//]]>