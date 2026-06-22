import * as Yup from "yup";

export const incomeSchema = Yup.object({
  amount: Yup.string()
    .required("Please fill in the amount !")
    .test(
      "positive",
      "Amount must be greater than 0 !",
      (value) => !!value && Number(value.replace(",", ".")) > 0
    ),
});
