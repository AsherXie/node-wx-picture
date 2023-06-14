type Rules = RegExp | (() => boolean);

export interface ParamsVerify {
  key: string;
  rules?: Rules;
  require?: boolean;
  text?: string;
}

export type ParamsVerifyArray = Array<ParamsVerify>;

const verifyParameters = (paramsRules: ParamsVerifyArray, params: object) => {
  const error = paramsRules.find((validator) => {
    const { rules, key, require } = validator;
    const data = params[key];
    if (require) return data === null || data === undefined;

    if (rules instanceof RegExp) {
      return !rules.test(String(data));
    }

    if (typeof rules === 'function') {
      return !rules();
    }

    return true;
  });
  if (error && error.require) {
    error.text = `${error.key} is required`;
  }
  return error;
};

export default verifyParameters;
