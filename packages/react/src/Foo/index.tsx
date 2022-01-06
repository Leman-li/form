import React, { useRef } from 'react';
import { Engine, FormEngine, FormPlugin } from '../core';
import { Input } from 'antd'

import TForm from '..';
class Aplugin extends FormPlugin {
    apply(engine: FormEngine): void {

        engine.get('323').onChange.on(value=>{
            engine.setState([{
                name:'sadfaf',
                value:{
                    placeholder: value
                }}
            ])
        })
        engine.get('323').onChange.on(value=>{
        })
    }
}

class Bplugin extends FormPlugin{
    apply(engine: FormEngine): void {
        
    }
}
export default function () {
    return <TForm onChange={(values, name) => {
    }} plugins={[new Aplugin()]}>
        <TForm.Item label="姓名" name="sadfaf">
            <Input />
        </TForm.Item>
        <TForm.Item label="密码" name="323">
            <Input onChange={e=>e.currentTarget.value}/>
        </TForm.Item>
    </TForm>
}

