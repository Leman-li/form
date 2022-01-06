import { FormPlugin } from "tform-core";
import { Name } from "tform-core/es/engine";


export interface FormProps {
    /** 注册的plugin */
    plugins?: FormPlugin[],
    
    /** schema */
    schema?: any;

    /** uiSchema */
    uiSchema?: any;

    /** 数据变化时触发 */
    onChange?: (values: Record<string, any>, changeName?: Name) => void;
}