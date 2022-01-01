import { FormPlugin } from "tform-core";


export interface FormProps {
    /** 注册的plugin */
    plugins?: FormPlugin[],
    
    /** schema */
    schema: any;

    /** uiSchema */
    uiSchema?: any;

    /** 数据变化时触发 */
    onChange?: (values: Record<string, any>) => void;
}