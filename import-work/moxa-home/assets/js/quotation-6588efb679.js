
async function googleQuotationAddModel(model) {
    dataLayer = dataLayer || [];
    dataLayer.push({
        'event': 'ga4',
        'eventName': 'add_model',
        'itemList': model
    });

    //console.log('googleQuotationAddModel ' + model);
}

async function googleQuotationCheckQuotationBag(models) {
    dataLayer = dataLayer || [];
    dataLayer.push({
        'event': 'ga4',
        'eventName': 'check_quotation_bag',
        'itemList': models
    })

    //console.log('googleQuotationCheckQuotationBag ' + models);
}

async function googleQuotationConfirmContactInfo(models) {

    dataLayer = dataLayer || [];
    dataLayer.push({
        'event': 'ga4',
        'eventName': 'confirm_quotation_contact_info',
        'itemList': models
    })

    //console.log('googleQuotationConfirmContactInfo ' + models);
}

async function googleQuotationComplete(models) {
    if (Page_ClientValidate('contactform') === false)
        return;

    dataLayer = dataLayer || [];
    dataLayer.push({
        'event': 'ga4',
        'eventName': 'complete_quotation',
        'itemList': models
    })

    //console.log('googleQuotationComplete ' + models);
}
