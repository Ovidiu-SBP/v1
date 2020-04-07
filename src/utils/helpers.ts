import { values, has, get } from 'lodash';

type TextType = {
    '@language': 'en-us' | 'fi-fi',
    '@value': string
}

export type DefaultPropertyType = {
    '@id': string,
    '@type': string,
    'http://www.w3.org/2000/01/rdf-schema#label'?: TextType[],
    'http://www.w3.org/2000/01/rdf-schema#comment'?: TextType[],
    'http://www.w3.org/2000/01/rdf-schema#domain'?: Array<{'@id': string}>,
    'http://www.w3.org/2000/01/rdf-schema#range'?: Array<{'@id': string}>,
    'http://www.w3.org/2000/01/rdf-schema#subPropertyOf'?: Array<{'@id': string}>,
    'https://standards.oftrust.net/v1/Vocabulary/nest': Array<{'@id': string}>,
    'https://standards.oftrust.net/v1/Vocabulary/readonly': Array<{'@type': string, '@value': string}>,
    'https://standards.oftrust.net/v1/Vocabulary/required': Array<{'@type': string, '@value': string}>

}

export type ClassItemType = {
    url: string,
    id: string,
    type: string,
    label?: string,
    comment?: string,
    subClass?: string
}

export type PropertyItemType = {
    url: string,
    id: string,
    category?: string,
    comment: [{comment: TextType[]}] | null,
    label: [{label: TextType[]}] | null,
    range?: string,
    domain: string[] | null
}

export type NodeType = {
    path: string,
    children: string[],
    root?: boolean
}

export type PropertyTypes = {
    id: string,
    url: string,
    category: string,
    description: string,
    range: string
};

export type IdElementType = {
    id: string,
    domain: string[] | null,
    comment: TextType[] | null,
    label: TextType[] | null
}

export type PointersType = {
    [key: string]: IdElementType
}

export function modifyClass(item: any, language: string) {
    const splitter: string = 'v1/Vocabulary/';
    const commentKey: string = 'http://www.w3.org/2000/01/rdf-schema#comment';
    const labelKey: string = 'http://www.w3.org/2000/01/rdf-schema#label';
    const lang: 'en-us' | 'fi-fi' = language === 'en' ? 'en-us' : 'fi-fi';

    const partialPath: string = item['@id'].split(splitter).pop();
    const id: string = partialPath.split('/').pop() || '';
    const type: string = item['@type'][0].split('http://www.w3.org/2002/07/').pop();
    let label = '';
    let comment = ''

    if (lang !== 'en-us') {
        const labelFi = has(item, labelKey) ? get(item, labelKey).find((k: TextType) => get(k, '@language') === lang) : null;
        const labelEn = has(item, labelKey) ? get(item, labelKey).find((k: TextType) => get(k, '@language') === 'en-us') : null;
        const commentFi = has(item, commentKey) ? get(item, commentKey).find((k: TextType) => get(k, '@language') === lang) : null
        const commentEn = has(item, commentKey) ? get(item, commentKey).find((k: TextType) => get(k, '@language') === 'en-us') : null;
        
        label = labelEn && labelFi ? `${get(labelFi, '@value')} (${get(labelEn, '@value')})` :
                labelEn && !labelFi ? `Ei etikettiä (${get(labelEn, '@value')})` : 'Ei etikettiä';
        comment = commentEn && commentFi ? `${get(commentFi, '@value')} (${get(commentEn, '@value')})` :
                    commentEn && !commentFi ? `Ei kuvausta (${get(commentEn, '@value')})` : 'Ei kuvausta';
    } else {
        const labelObject: TextType | null = get(item, labelKey) ? 
            get(item, labelKey).find((k: any) => {
                return get(k, '@language') === lang
            }) : null;
        const commentObject: TextType | null = get(item, commentKey) ? 
            get(item, commentKey).find((k: any) => {
                return get(k, '@language') === lang;
            }) : null;
        label = labelObject ? get(labelObject, '@value') : '';
        comment = commentObject ? get(commentObject, '@value') : '';
    }
    
    const subClass: string = 'http://www.w3.org/2000/01/rdf-schema#subClassOf' in item ? item['http://www.w3.org/2000/01/rdf-schema#subClassOf'].map((k: any) => k['@id'].split(splitter).join('').split('/').pop()).join(', ') : '';
    const isContext = partialPath
        .split('/')
        .some((s: string) => {
            return ['Identity', 'Link'].includes(s)
        });
    const url = isContext ? `/v1/Context/${partialPath}/` : `/v1/Vocabulary/${partialPath}`

    return {
        url,
        id,
        type,
        label,
        comment,
        subClass
    }
}

function extractData(schemaKey: string, vocabKey: string, item: any, pointer: PointersType, type: 'comment' | 'label') {
    return has(item, schemaKey) ? [{[type]: get(item, schemaKey)}] :
            has(item, vocabKey) ? get(item, vocabKey).map((element: {'@id': string}) => {
                const pointerItem = get(pointer, get(element, '@id'));

                return {
                    [type]: pointerItem[type],
                    domain: pointerItem.domain
                }
            }) : null
}

export function modifyProps(item: DefaultPropertyType, pointer: PointersType): PropertyItemType {
    const splitter: string = 'v1/Vocabulary/';
    const commentVocabKey: string = 'https://standards.oftrust.net/v1/Vocabulary/comment';
    const labelVocabKey: string = 'https://standards.oftrust.net/v1/Vocabulary/label';
    const commentSchemaKey: keyof DefaultPropertyType = 'http://www.w3.org/2000/01/rdf-schema#comment';
    const labelSchemaKey: keyof DefaultPropertyType = 'http://www.w3.org/2000/01/rdf-schema#label';
    const domainKey: keyof DefaultPropertyType = 'http://www.w3.org/2000/01/rdf-schema#domain';
    const rangeKey: keyof DefaultPropertyType = 'http://www.w3.org/2000/01/rdf-schema#range';
    const categoryKey: keyof DefaultPropertyType = 'http://www.w3.org/2000/01/rdf-schema#subPropertyOf';

    const url: string = item['@id'].split(splitter).filter((s: string) => !!s).pop() || '';
    const id: string = url.split('/').filter((s: string) => !!s).pop() || '';
    const label = extractData(labelSchemaKey, labelVocabKey, item, pointer, 'label');
    const comment = extractData(commentSchemaKey, commentVocabKey, item, pointer, 'comment');
    const category = item[categoryKey] ? get(item[categoryKey], '[0].@id')
        .split('/')
        .filter((s: string) => !!s)
        .pop() : null;
    const domain: string[] | null = has(item, domainKey) ? get(item, domainKey)!
        .map((element: {'@id': string}) => {
            return get(element, '@id')
                .split('/')
                .filter((s: string) => !!s)
                .pop() || '';
        }) : null;
    const range: string = item[rangeKey] ? get(item[rangeKey], '[0].@id')
        .split('http://www.w3.org/2001/XMLSchema#')
        .filter((s: string) => !!s)
        .pop() : null;

    return {
        id,
        url: `/v1/Vocabulary/${url}`,
        label,
        comment,
        category,
        domain,
        range
    }
}

export function modifyIdElement(item: any): IdElementType {
    const domainKey = 'https://standards.oftrust.net/v1/Vocabulary/domain';
    const domain = has(item, domainKey) ? get(item, domainKey)
        .map((element: any) => {
            return get(element, '@id')
                .split('/')
                .filter((s: string) => !!s)
                .pop()
        }) : null

    return {
        id: get(item, '@id'),
        comment: get(item, 'http://www.w3.org/2000/01/rdf-schema#comment') || null,
        label: get(item, 'http://www.w3.org/2000/01/rdf-schema#label') || null,
        domain
    }
}

export function getRootNodes(data: { [key: string]: NodeType }) {
    return values(data).filter(node => node.root === true);
}

export function buildTree(list: ClassItemType[]) {
    return list.reduce((acc: any, current) => {
        const currentId: string = current.id;
        if (current.subClass) {
            let parents: string[] = current.subClass.split(', ');

            return parents.reduce((r: any, c: string) => {
                return c in r ? {
                    ...r,
                    [c]: {
                        ...r[c],
                        children: [
                            ...r[c].children,
                            currentId
                        ]
                    },
                    [currentId]: currentId in r ? r[currentId] : { path: current.url, children: [] }
                } : {
                        ...r,
                        [c]: {
                            path: c,
                            children: [currentId]
                        },
                        [currentId]: currentId in r ? r[currentId] : { path: current.url, children: [] }
                    }
            }, acc)
        }

        return currentId in acc ? {
            ...acc,
            [currentId]: {
                ...acc[currentId],
                root: true
            }
        } : {
                ...acc,
                [currentId]: {
                    path: current.url,
                    children: [],
                    root: true
                }
            }
    }, {});
}

export function parentsToState(data: NodeType[], initStatus: boolean): { [key: string]: boolean } | null {
    if (!data.length) return null;

    return data.reduce((acc, item) => {
        return {
            ...acc,
            [item.path]: initStatus
        }
    }, {});
}

export function getChildNodes(roots: any, node: NodeType) {
    return node.children.length ? node.children.map((path: string) => roots[path]) : [];
}

export function extractProperties(data: any): { [key: string]: PropertyTypes } {
    return Object.keys(data)
        .filter(key => data[key]['@type'] === 'owl:DatatypeProperty')
        .reduce((acc, current) => {
            const prop = data[current];
            const url: string = `/v1/Vocabulary/${get(prop, '@id').split('pot:').pop()}`;
            return {
                ...acc,
                [current]: {
                    id: current,
                    url,
                    category: prop['subPropertyOf'] || '',
                    description: has(prop, 'rdfs:comment') && has(prop, 'rdfs:comment.en-us') ? get(prop, 'rdfs:comment.en-us') : '',
                    range: get(prop, 'domain.0') || ''
                }
            }
        }, {});
};

function isPathInDomain(domains: string[], path: string): boolean {
    return path
        .split('/')
        .filter((s: string) => !!s)
        .some((s: string) => domains.includes(s));
}

export function extractTextForDetails(path: string, item: any, lang: string, type: 'label' | 'comment') {
    let value = [];
    const language: 'en-us' | 'fi-fi' = lang === 'en' ? 'en-us' : 'fi-fi';

    if (item[type]) {
        value = item[type].map((element: any) => {
            if (!get(element, 'domain')) {
                if (language !== 'en-us') {
                    const emptyText = type === 'label' ? 'Ei etikettiä' : 'Ei kuvausta';
                    const fi = element[type].find((k: TextType) => get(k, '@language') === 'fi-fi');
                    const en = element[type].find((k: TextType) => get(k, '@language') === 'en-us');

                    return en && fi ? `${get(fi, '@value')} (${get(en, '@value')})` :
                        en && !fi ? `${emptyText} (${get(en, '@value')})` : '';
                }

                const currentLanguageValue = element[type].find((k: any) => get(k, '@language') === language);

                return currentLanguageValue ? get(currentLanguageValue, '@value') : ''
            } else if (get(element, 'domain') && isPathInDomain(get(element, 'domain'), path)) {
                if (language !== 'en-us') {
                    const emptyText = type === 'label' ? 'Ei etikettiä' : 'Ei kuvausta';
                    const fi = element[type].find((k: TextType) => get(k, '@language') === 'fi-fi');
                    const en = element[type].find((k: TextType) => get(k, '@language') === 'en-us');

                    return en && fi ? `${get(fi, '@value')} (${get(en, '@value')})` :
                        en && !fi ? `${emptyText} (${get(en, '@value')})` : emptyText;
                }
                const currentLanguageValue = element[type].find((k: any) => get(k, '@language') === language);

                return currentLanguageValue ? get(currentLanguageValue, '@value') : ''
            }

            return '';
        })
    }

    return Array.from(new Set(value.flat().filter((s: string) => !!s))).join(', ');
}

export function extractTextForGrid(item: any, lang: string, type: 'label' | 'comment') {
    const language: 'en-us' | 'fi-fi' = lang === 'en' ? 'en-us' : 'fi-fi';
    const emptyTextFi = type === 'label' ? 'Ei etikettiä' : 'Ei kuvausta';
    const emptyTextEn = type === 'label' ? 'Has no label' : 'Has no description';

    if (get(item, type)) {
        return get(item, type)
            .map((item: any) => {
                if (get(item, type)) {
                    if (language !== 'en-us') {
                        const fi = item[type].find((k: TextType) => get(k, '@language') === 'fi-fi');
                        const en = item[type].find((k: TextType) => get(k, '@language') === 'en-us');
    
                        return en && fi ? `${get(fi, '@value')} (${get(en, '@value')})` :
                            en && !fi ? `${emptyTextFi} (${get(en, '@value')})` : emptyTextFi;
                    }

                    const filteredLabel = get(item, type).find((element: any) => {
                        return get(element, '@language') === language;
                    });

                    return filteredLabel ? get(filteredLabel, '@value').slice(0, 1).toUpperCase() + get(filteredLabel, '@value').slice(1) : '';
                }
                
                return '';
            })
            .filter((s: string) => !!s)
            .join(', ');
    }

    return '';
}

export function pathNameToTabValue(path: string): string {
    switch (path.toLowerCase()) {
        case 'context':
            return 'generalinformation';
        case 'vocabulary':
            return 'vocabulary';
        case 'classdefinitions':
            return 'classdefinitions';
        case 'dataexample':
            return 'dataexample';
        case 'jsonschema':
            return 'jsonschema';
        default :
            return 'generalinformation'
    }
};

export function tabValueToPathName(tabValue: string): string {
    switch (tabValue.toLowerCase()) {
        case 'context':
            return 'Context';
        case 'generalinformation':
            return 'Context';
        case 'vocabulary':
            return 'Vocabulary';
        case 'classdefinitions':
            return 'ClassDefinitions';
        case 'jsonschema':
            return 'Context';
        case 'dataexample':
            return 'Context'
        default :
            return tabValue
    }
}

export function setToLocalStorage(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));
}

export function getLanguageFromStorage(): 'en' | 'fi' {
    const value: string | null = localStorage.getItem('language') ;

    if (!value) {
        return 'en';
    }

    return JSON.parse(value);
};