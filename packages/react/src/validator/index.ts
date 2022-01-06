import get from 'lodash.get';
import set from 'lodash.set';
type Rule = {
    validate?: (value: any, params: any) => boolean;
    message?: string;
}

type DefineRuleArgs = [name: string, rule: Rule] | [(Rule & { name: string })];

type Path = string | number | Array<string | number>

export default class Validator {
    _rules: Record<string, Rule | undefined> = {};
    _errors: any = {};
    constructor() {

    }

    /** 定义规则 */
    defineRule(...args: DefineRuleArgs) {
        const arg0 = args[0]
        if (typeof arg0 === 'string') {
            this._rules[arg0] = args[1]
        } else if (arg0?.name) {
            this._rules[arg0?.name] = { ...args[1] }
        }
    }

    /** 通过路径验证值 */
    _validateByPath(value: any, path: Path, ruleStr: string) {
        const rules: Array<Rule | undefined> = [];
        ruleStr.split('|').forEach(name => {
            name && rules.push(this._rules[name])
        });
        const _value = get(value, path, undefined);
        while (rules.length) {
            const rule = rules.shift();
            if (rule && rule.validate) {
                const passed = rule?.validate(_value, 'name');
                // 如果不通过
                if (!passed) {
                    set(this._errors, path, rule.message)
                    return false;
                }
                set(this._errors, path, undefined)
                return true;
            }
        }
    }


    /**
     * 
     * @param value 验证的值
     * @param ruleStr 规则字符串
     */
    validate(value: any, ruleStr: string) {
        // 如果value不是对象直接验证
        if (typeof value !== 'object') {

        }
    }
}

const validator = new Validator();
validator.defineRule({ name: 'sffdf', validate: () => true, message: '' })