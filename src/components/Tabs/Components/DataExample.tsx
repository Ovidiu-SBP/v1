import React, { useState, useEffect } from 'react';
import SystemAPI from '../../../services/api';
import Spinner from '../../Spinner';
import { Error404 } from '../../Errors';
import { get, has, omit } from 'lodash';
import ContentViewer from '../../ContentViewer';

type ResultData = {
    "@context": string
    [key: string] : {[key: string]: string} | string
}

type ContextData = {
    '@id': string,
    '@nest': string
}

type DataExampleProps = {
    path: string
}

const DataExample: React.FC<DataExampleProps> = (props) => {
    const {
        path
    } = props;
    const [value, setValue] = useState({
        data: null,
        loading: true,
        error: false
    });
    const currentPath: string = path.split('/').filter(s => !!s).join('/');
    const id: string = path
        .split('/')
        .filter(s => !!s)
        .pop() || '';

    useEffect(() => {
        let mounted = false;

        SystemAPI.getData(`/${currentPath}`)
            .then(data => {
                if (!mounted) {
                    if (typeof data === 'number') {
                        setValue(prevValue => ({
                            ...prevValue,
                            error: true
                        }))
                    } else {
                        setValue({
                            data,
                            loading: false,
                            error: false
                        })
                    }
                }
            })

        return () => {
            mounted = true;
        }
    }, [path]);

    if (value.error) return <Error404 />
    if (value.loading && !value.error) return <Spinner />

    const context: any = omit(get(value.data, '@context'), ['@version', '@vocab', '@classDefinition', 'pot']);

    const properties: { [key: string]: ContextData } = Object.keys(context)
        .filter(key => !!has(context[key], '@nest'))
        .reduce((acc, current) => ({...acc, [current]: context[current]}), {});

    const parents: {[key: string]: string} = Object.keys(context)
        .filter(key => !has(context[key], '@nest'))
        .sort()
        .reduce((acc, current) => ({...acc, [current]: ""}), {});

    const initObj: {[key: string]: string} = {
        "@context": `https://standards-ontotest.oftrust.net${path}`,
        "id": "",
        "data": "",
        "metadata": "",
        ...parents
    };

    const data: ResultData = Object.keys(properties).reduce(
        (acc: any, current) => {
            const nest: string = get(properties[current], '@nest') || '';

            acc[nest] = typeof acc[nest] === 'string' ? { [current]: "" } : Object.assign({}, acc[nest], { [current]: "" })

            return acc;
        },
        initObj
    );

    return (
        <ContentViewer 
            content={data}
            playground={true}
            fileName={`${id}DataExample.json`}
        />
    )
}

export default DataExample;