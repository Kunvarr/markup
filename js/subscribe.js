/**
 * Created by gendos on 26.12.16.
 */

function initSubscribeForm() {

    var isRSubscribeLoading = false;
    $('#subscription_form').on('submit', function (e) {
        e.preventDefault();
        e.stopPropagation();

        if (isRSubscribeLoading)
            return;

        var form = $(this),
            formParent = form.parents('.subscription');

        isRSubscribeLoading = true;
        BX.showWait(formParent[0]);

        $.post(SITE_TEMPLATE_PATH+'/ajax/subscribe.php', form.serialize())
            .done(function (result) {
                try { result = JSON.parse(result); } catch (e) {}

                if (result && typeof result.state != 'undefined') {
                    if (!result.state) {
                        for (k in result.errors) {
                            form.find('[name='+result.errors[k]+']').addClass('is-error');
                        }
                    } else {
                        formParent.find('.subscription-result').html(result.message);
                        form.hide();
                    }
                }

                BX.closeWait();
                BX.onCustomEvent('onAjaxSuccess');
            })
            .error(fatalErrorHandler)
            .always(function () {
                isRSubscribeLoading = false;
            });
    })
}

BX.ready(initSubscribeForm);