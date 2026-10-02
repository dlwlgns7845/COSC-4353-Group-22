// Assignment 2 - Part 5
/* =========================
   QUEUESMART
   CLIENT-SIDE VALIDATION
========================= */


/*
    Validate a single form field.
*/

function validateField(field) {

    const label =
        field.dataset.label ||
        field.name ||
        "This field";


    const errorElement =
        document.getElementById(
            field.id + "Error"
        );


    let errorMessage = "";


    /*
        REQUIRED FIELD
    */

    if (
        field.hasAttribute("required") &&
        field.value.trim() === ""
    ) {

        errorMessage =
            `${label} is required.`;

    }


    /*
        EMAIL FORMAT
    */

    else if (
        field.type === "email" &&
        field.value.trim() !== ""
    ) {

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (
            !emailPattern.test(
                field.value.trim()
            )
        ) {

            errorMessage =
                "Please enter a valid email address.";

        }

    }


    /*
        MINIMUM LENGTH
    */

    if (
        errorMessage === "" &&
        field.minLength > 0 &&
        field.value.length < field.minLength
    ) {

        errorMessage =
            `${label} must be at least ${field.minLength} characters long.`;

    }


    /*
        MAXIMUM LENGTH
    */

    if (
        errorMessage === "" &&
        field.maxLength > 0 &&
        field.maxLength !== 524288 &&
        field.value.length > field.maxLength
    ) {

        errorMessage =
            `${label} cannot exceed ${field.maxLength} characters.`;

    }


    /*
        NUMBER INPUT
        Used later for fields such as
        Expected Duration.
    */

    if (
        errorMessage === "" &&
        field.type === "number" &&
        field.value !== ""
    ) {

        const numberValue =
            Number(field.value);


        if (Number.isNaN(numberValue)) {

            errorMessage =
                `${label} must be a valid number.`;

        }


        else if (
            field.min !== "" &&
            numberValue < Number(field.min)
        ) {

            errorMessage =
                `${label} must be at least ${field.min}.`;

        }


        else if (
            field.max !== "" &&
            numberValue > Number(field.max)
        ) {

            errorMessage =
                `${label} cannot exceed ${field.max}.`;

        }

    }


    /*
        DATE INPUT
        Reusable if a QueueSmart form
        contains a date field later.
    */

    if (
        errorMessage === "" &&
        field.type === "date" &&
        field.value !== ""
    ) {

        const dateValue =
            new Date(field.value);


        if (
            Number.isNaN(
                dateValue.getTime()
            )
        ) {

            errorMessage =
                `Please enter a valid ${label.toLowerCase()}.`;

        }

    }


    /*
        DISPLAY RESULT
    */

    if (errorMessage !== "") {

        field.classList.add(
            "input-error"
        );


        field.classList.remove(
            "input-valid"
        );


        if (errorElement) {

            errorElement.textContent =
                errorMessage;

        }


        return false;

    }


    field.classList.remove(
        "input-error"
    );


    /*
        Only show green validation
        when the user entered something.
    */

    if (field.value.trim() !== "") {

        field.classList.add(
            "input-valid"
        );

    }


    if (errorElement) {

        errorElement.textContent = "";

    }


    return true;
}


/* =========================
   VALIDATE FORM
========================= */

function validateForm(form) {

    const fields =
        form.querySelectorAll(
            "input, select, textarea"
        );


    let formIsValid = true;


    fields.forEach(field => {

        const fieldIsValid =
            validateField(field);


        if (!fieldIsValid) {

            formIsValid = false;

        }

    });


    return formIsValid;
}


/* =========================
   INITIALIZE ALL FORMS
========================= */

const forms =
    document.querySelectorAll("form");


forms.forEach(form => {

    const fields =
        form.querySelectorAll(
            "input, select, textarea"
        );


    /*
        Validate when the user
        leaves a field.
    */

    fields.forEach(field => {

        field.addEventListener(
            "blur",
            function () {

                validateField(field);

            }
        );


        /*
            Remove/update errors
            as the user corrects input.
        */

        field.addEventListener(
            "input",
            function () {

                if (
                    field.classList.contains(
                        "input-error"
                    )
                ) {

                    validateField(field);

                }

            }
        );

    });


    /*
        Validate before submission.
    */

    form.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const successMessage =
                form.querySelector(
                    "#formSuccess"
                );


            const formIsValid =
                validateForm(form);


            if (!formIsValid) {

                if (successMessage) {

                    successMessage.classList.remove(
                        "show"
                    );

                }


                /*
                    Move focus to the
                    first invalid field.
                */

                const firstInvalidField =
                    form.querySelector(
                        ".input-error"
                    );


                if (firstInvalidField) {

                    firstInvalidField.focus();

                }


                return;
            }


            /*
                A2 does not require a backend,
                so successful submission is
                simulated in the UI.
            */

            if (successMessage) {

                successMessage.textContent =
                    "Validation successful. The form is ready to submit.";

                successMessage.classList.add(
                    "show"
                );

            }


            /*
                If the form has a data-redirect attribute,
                go to that page after the check passes.
            */

            if (form.dataset.redirect) {

                window.location.href =
                    form.dataset.redirect;

            }

        }
    );

});
