document.querySelector('[id*="_TextFooterEmail"]').addEventListener('keydown', function (e) {
        var submitBtn = this.parentNode.querySelector('button')
        if (e.key === "Enter") {
            e.preventDefault()
            if (!submitBtn.disabled) submitBtn.click()
        }
    })