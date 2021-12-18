import { FormEngine } from "./engine";

export default class FormPlugin {

    apply(engine: FormEngine) {
        throw new Error('请实现apply方法')
    }
}