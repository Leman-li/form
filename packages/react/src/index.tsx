import React, { useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { Engine, FormEngine, FormPlugin } from './core';
import { Name } from 'tform-core/es/engine';
import Row from 'antd/lib/row';
import 'antd/lib/row/style/index'
import Col from 'antd/lib/col';
import './index.less'
import 'antd/dist/antd.css';

type ColProps = React.ComponentProps<typeof Col>;

export interface TFormProps {
    /** 注册的plugin */
    plugins?: FormPlugin[],

    /** 数据变化时触发 */
    onChange?: (values: Record<string, any>, changeName?: Name) => void;

    children?: React.ReactNode;

    labelCol?: ColProps['span'];

    wrapperCol?: ColProps['span'];
}

type TFormContextValue = Pick<TFormItemProps, 'labelCol' | 'wrapperCol'> & {
    engine: Engine
}
// @ts-ignore
const TFromContext = React.createContext<TFormContextValue>({})

export default function TForm(props: TFormProps) {
    const { plugins = [], children, onChange, labelCol, wrapperCol } = props;

    // 构建引擎
    const engine = useMemo(() => {
        const _engine = new Engine();
        _engine.registerPlugins(plugins);
        return _engine;
    }, [plugins]);


    const forceUpdate = useForceUpdate()

    useEffect(() => {
        const handleChange = ({ values, changedName }: any = {}) => onChange?.(values, changedName);
        engine.hooks.didMount.call(undefined);
        engine.hooks.forceUpdate.on(forceUpdate)
        engine.hooks.onChange.on(handleChange)
        return () => {
            engine.hooks.willUnmount.call(undefined);
            engine.hooks.forceUpdate.off(forceUpdate);
            engine.hooks.onChange.off(handleChange)
        }
    }, [])
    return <TFromContext.Provider value={{ engine, labelCol, wrapperCol }}><div className='tform'>{children}</div></TFromContext.Provider>

}

export interface TFormItemProps {
    name: Name;
    label?: React.ReactNode;
    children: React.ReactElement<{ value: any, onChange: (value: any) => void }>;
    labelCol?: ColProps['span'];
    wrapperCol?: ColProps['span'];
    hidden?: boolean;
}

TForm.Item = function (props: TFormItemProps) {
    const [itemState, setItemState] = useState()
    const _props = Object.assign({}, props, itemState)
    const engine = useEngine()
    useEffect(() => {
        engine.get(props.name).setItemState.on(setItemState);
        return () => {
            engine.get(props.name).setItemState.on(setItemState);
        }
    }, [])
    if (props.hidden) return null;
    return <ItemWapper {..._props} />

}

function ItemWapper(props: TFormItemProps) {
    const { name, children, label, labelCol, wrapperCol, hidden } = props;
    const { engine, labelCol: formLabelCol, wrapperCol: formWrapperCol } = useContext(TFromContext)
    const itemEngine = engine.get(name)
    const forceUpdate = useForceUpdate()
    const [_props, setState] = useState({});
    useEffect(() => {
        itemEngine.didMount.call(undefined);
        engine.hooks.itemDidMount.call(name)
        itemEngine.forceUpdate.on(forceUpdate);
        itemEngine.setState.on(setState);
        return () => {
            itemEngine.willUnmount.call(undefined);
            itemEngine.forceUpdate.off(forceUpdate);
            itemEngine.setState.off(setState);
            engine.hooks.itemWillUnmount.call(name)
            // 卸载时将值设为undefined
            engine.setFields([{ name, value: undefined }]);
        }
    }, [])

    // 获取数据值
    const value = engine.getFieldValue(name);

    // 获取验证错误值
    const error = engine.getFieldError(name)

    const onChange = (val: any) => {
        const value = val?.currentTarget?.value ?? val;
        engine.setFields([{ name, value }])
        itemEngine.onChange.call(value);
        engine.hooks.itemOnChange.call({ value, name });
        engine.hooks.onChange.call({ values: engine.getFieldsValue(), changedName: name })
    }

    return (
        <Row className='tform-item'>
            <Col span={labelCol ?? formLabelCol} className='tform-item-label'><label className='tform-item-required'>{label}</label></Col>
            <Col span={wrapperCol ?? formWrapperCol} className='tform-item-control'>
                {React.cloneElement(children, { ..._props, value, onChange })}
                <ErrorInfo msg={error} />
            </Col>
        </Row>
    )
}

function useForceUpdate() {
    const [_, forceUpdate] = useReducer(c => ++c, 0);
    return forceUpdate
}

function useEngine() {
    return useContext(TFromContext).engine
}

interface ErrorInfoProps {
    msg?: string
}

function ErrorInfo({ msg }: ErrorInfoProps) {
    return msg ? <span className='tform-item-error-info'>{msg}</span> : <></>
}