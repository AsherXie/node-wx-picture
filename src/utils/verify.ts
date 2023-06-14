type Rules = RegExp | (() => boolean);

export interface ParamsVerify {
  data: string | number;
  rules?: Rules;
  require?: boolean;
  text: string;
}

const verifyParameters = (params: Array<ParamsVerify>) =>
  params.find((validator) => {
    const { rules, data, require } = validator;

    if (require) {
      return !data;
    }

    if (rules instanceof RegExp) {
      return !rules.test(String(data));
    }

    if (typeof rules === 'function') {
      return !rules();
    }

    return true;
  });

export default verifyParameters;
