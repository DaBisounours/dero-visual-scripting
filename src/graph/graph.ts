import { atomWithImmer } from 'jotai-immer'
import { useAtom } from "jotai"
import { selectedFunctionAtom } from "../App"
import { hasSome, unwrap } from "../utils/variants"
import { LinksReduce, linksImmerReducer } from "./links"
import { Node, NodeLink, NodeDataKind, NodesReduce, nodesImmerReducer, numericContitionOperatorMap, stringContitionOperatorMap } from "./nodes"
import { DVM, DVMType } from '../dvm/types'
import { atomWithStorage } from 'jotai/utils'
import { match } from 'ts-pattern'

export type Project = {
    functions: Functions,
} & ProjectOptions


export type ProjectOptions = {
    name: string,
}

export type Functions = {
    [name: string]: FunctionData
}

export type FunctionData = {
    isProcess: boolean,
    nodes: Nodes,
    links: Links,
    args: {
        [name: string]: {
            type: DVMType
        }
    },
    return: DVMType
}

export type Nodes = { [id: number]: Node };
export type Links = NodeLink[]


export const initialFunctions: Functions = {
    'Initialize': {
        nodes: {
            0: {
                name: 'Start',
                edit: false,
                position: { x: 16, y: 16 },
                locked: true,
                data: {
                    type: NodeDataKind.Start,
                }
            },
            1: {
                name: 'End',
                edit: false,
                position: { x: 256, y: 16 },
                locked: false,
                data: {
                    type: NodeDataKind.End,
                    end: { type: 'return', returnType: DVMType.Uint64, value: 0 },
                }
            },
        },
        links: [
            {
                from: {
                    id: 0, output: 0
                }, to: {
                    id: 1, input: 0
                }, type: { type: 'flow' }
            }
        ],
        isProcess: false,
        args: {},
        return: DVMType.Uint64,
    }
};


export const storageProjectAtom = atomWithStorage<Project>('current', { name: 'Initial Project', functions: initialFunctions });
export const projectOptionsAtom = atomWithImmer<ProjectOptions>({ name: 'Initial Project' });
export const functionsAtom = atomWithImmer<Functions>(initialFunctions);


export const useGraphAtomReducer = () => {
    const [functions, setFunctions] = useAtom(functionsAtom);
    const [selectedFunction] = useAtom(selectedFunctionAtom);

    if (hasSome(selectedFunction)) {
        const key = unwrap(selectedFunction);
        const _function = functions[key];
        const nodes = _function.nodes;
        const updateNodes = (nodesReduce: NodesReduce) => {
            setFunctions((draft) => {
                const nodes = nodesImmerReducer(draft[key].nodes, nodesReduce);
                if (nodes !== undefined) {
                    draft.nodes = nodes;
                }
            })
        }
        const links = _function.links;
        const updateLinks = (linksReduce: LinksReduce) => {
            setFunctions((draft) => {
                const links = linksImmerReducer(draft[key].links, linksReduce);
                if (links !== undefined) {
                    draft[key].links = links;
                }
            })
        }
        return { nodes, updateNodes, links, updateLinks }
    } else {
        const nodes: Nodes = {};
        const links: Links = [];

        return {
            nodes,
            updateNodes: (a: NodesReduce) => { },
            links,
            updateLinks: (a: LinksReduce) => { },
        }
    }
}



enum GraphErrorType {
    Path = "path",
    ConnectionMissing = "connection_missing",
}

type GraphError = { functionName?: string } & ({
    [GraphErrorType.Path]: PathGraphError
} | {
    [GraphErrorType.ConnectionMissing]: ConnectionMissingGraphError
})

type GraphErrors = GraphError[]

type PathGraphError = {

    nodeId: number,
}
type ConnectionMissingGraphError = {

    nodeId: number
    inOut: number,
}

export function validateFunctions(functions: Functions): { valid: boolean; errors: GraphErrors; } {
    let result: { valid: boolean; errors: GraphErrors; } = { valid: true, errors: [] };
    for (const name in functions) {

        console.log('validating functions', name);
        const { valid, errors } = validateFunction(functions[name])
        console.log({ valid, errors });

        result.valid == result.valid && valid;
        errors.forEach((e: GraphError) => {
            result.errors.push({ ...e, functionName: name });
        })
    }
    console.log('result', result);

    return result;

}


// TODO move in webworker
export function validateFunction(_function: FunctionData): { valid: boolean; errors: GraphErrors; } {
    let nodesChecked: { [id: number]: boolean } = {};

    for (const nodeId in _function.nodes) {
        const node = _function.nodes[nodeId];
        // todo continue here
    }

    return { valid: true, errors: [] }
}




const newLine = '\n';
const newParagraph = '\n\n';

// TODO move in webworker
export function generateProjectCode(functions: Functions) {
    return Object.keys(functions)
        .map(f => generateFunctionCode(f, functions[f]))
        .join(newParagraph);
}


type Processed = {
    [nodeId: number]: {
        statements: string[],
        expressions: { [inout: number]: string },
        lines: number
        startLine: number,
    } | null
}

export function generateFunctionCode(name: string, functionData: FunctionData) {
    console.warn(name, { data: functionData });

    // Traverse DAG Depth first
    let order: number[] = [];
    let processed: Processed = {};


    const vertices = functionData.nodes;
    const edges = functionData.links;

    function depth_first(i: number) {

        if (!(i in processed)) {
            // this is to mark as visited, but content is not generated yet
            processed[i] = null;

            // for all edges i -> j
            edges.filter(e => e.from.id == i).forEach(e => {
                const j = e.to.id;
                depth_first(j);
            })
            order.push(i);
        }
    }

    Object.keys(vertices).forEach(key => {
        const nodeId = Number(key);
        depth_first(nodeId);
    })


    const args = Object.entries(functionData.args).map(([arg, t]) => `${arg} ${t.type}`);
    let output = `Function ${name}(${args.join(', ')}) ${functionData.return}` + newLine;
    let line = 1;
    // reverse : depth first pushes in reverse order of dependencies
    order.reverse().forEach(nodeId => {
        processed[nodeId] = generateNodeStatements(nodeId, vertices, edges, processed, functionData);
        // @ts-ignore //! messy
        processed[nodeId].startLine = line;

        const lines = (processed[nodeId]?.statements || []);
        lines.forEach(l => {
            output += line++ + '\t' + l + newLine;
        })

    });
    
    // Post fix GOTOs
    let index = 0;

    while (index >= 0) {
        index = output.indexOf('GOTO ?');

        if (index < 0) {
            break;
        } else {
            const endIndex = output.slice(index).indexOf('\n');
            const foundGoto = output.slice(index, index + endIndex);
            const targetNode = Number(foundGoto.split('?')[1]);
            
            output = output.slice(0, index) + `GOTO ${processed[targetNode]?.startLine}` + output.slice(index + endIndex)
            
        }
    }

    output += 'End Function'


    return output;

}


export function generateNodeStatements(nodeId: number, vertices: Nodes, edges: Links, processed: Processed, functionData: FunctionData) {

    const node = vertices[nodeId];
    let statements: string[] = [
        //`// ${node.name}`
    ];
    //let lines = 1;
    let lines = 0;
    let expressions: { [output: number]: string } = {};
    match(node.data)
        .with({ type: NodeDataKind.Start }, _ => { 
            Object.keys(functionData.args).forEach((arg, index) => {
                expressions[1 + index] = arg;
            });            
        })
        .with({ type: NodeDataKind.Argument }, data => { 
            expressions[0] = data.name;
        })
        .with({ type: NodeDataKind.End }, data => {
            const end = data.end;
            let statement = end.type.toUpperCase();
            if (end.type == 'return') {
                if (end.value == null) {
                    // find expression
                    const link = edges.find(edge => edge.to.id == nodeId && edge.to.input == 1);


                    if (link !== undefined) {
                        const [fromNodeId, fromOutput] = [link.from.id, link.from.output];
                        const fromNode = processed[fromNodeId]
                        statement += ' ' + fromNode?.expressions[fromOutput]
                    }

                } else {
                    statement += ' ' + end.value;
                }
            }
            statements.push(statement)
            lines += 1;
        })
        .with({ type: NodeDataKind.Function }, data => {
            const argNames = Object.keys(data.function.args)
            const asProcess = 'asProcess' in data.function && data.function.asProcess;
            const output = argNames.length;

            const args = argNames.map((name, index) => {
                // @ts-ignore //! what else ?
                const valueSet = data.function.args[name].valueSet;
                if (valueSet != null) {
                    return valueSet;
                } else {
                    // find expression
                    const link = edges.find(edge => edge.to.id == nodeId && edge.to.input == (asProcess ? index + 2 : index));
                    
                    if (link !== undefined) {
                        const [fromNodeId, fromOutput] = [link.from.id, link.from.output];
                        const fromNode = processed[fromNodeId]
                        if (fromNode != null) {
                            return fromNode.expressions[fromOutput]
                        }

                    }
                    return ''
                }

            });

            const expression = data.function.name + `(${args.join(', ')})`;

            if (asProcess) {
                statements.push(expression)
            }
            expressions[output] = expression
        })
        .with({ type: NodeDataKind.DimLet }, data => {
            statements.push('DIM ' + data.dimlet.name + ' as ' + data.dimlet.return.type)
            if (data.dimlet.args.in.valueSet == null) {
                // find expression
                const link = edges.find(edge => edge.to.id == nodeId);
                if (link !== undefined) {
                    const [fromNodeId, fromOutput] = [link.from.id, link.from.output];
                    const fromNode = processed[fromNodeId]
                    if (fromNode != null) {
                        statements.push('LET ' + data.dimlet.name + ' = ' + fromNode.expressions[fromOutput])
                    }

                }
            } else {
                statements.push('LET ' + data.dimlet.name + ' = ' + data.dimlet.args.in.valueSet)
            }

            lines += 2;
            edges.filter(edge => edge.from.id == nodeId).forEach(edge => {
                expressions[edge.from.output] = data.dimlet.name || '(unknown)' // TODO Generate name
            })

        })
        .with({ type: NodeDataKind.Goto }, _ => {
            const toNodeId = edges.find(edge => edge.from.id == nodeId)?.to.id;

            if (toNodeId !== undefined) {
                const toNode = processed[toNodeId];
                if (toNode) {
                    statements.push(`GOTO ${toNode.startLine}`)
                    lines += 1;
                }
                else {
                    statements.push(`GOTO ?${toNodeId}`)
                }
            }
        })
        .with({ type: NodeDataKind.Control, control: { type: 'if' } }, data => {
            const condition = data.control.condition;
            let statement = 'IF (';

            // LEFT
            if (condition.valueSet.left == null) {
                // find expression
                const link = edges.find(edge => edge.to.id == nodeId && edge.to.input == 1);

                if (link !== undefined) {
                    const [fromNodeId, fromOutput] = [link.from.id, link.from.output];
                    const fromNode = processed[fromNodeId]
                    statement += fromNode?.expressions[fromOutput]
                }
            } else {
                if (condition.type == DVMType.String) {
                    statement += '"' + condition.valueSet.left + '"';
                } else {
                    statement += condition.valueSet.left;
                }
                
            }


            // OPERATOR
            match(condition)
            .with({type: DVMType.String}, c => {
                statement += ` ${stringContitionOperatorMap[c.operator]} `
            })
            .with({type: DVMType.Uint64}, c => {
                statement += ` ${numericContitionOperatorMap[c.operator]} `
            })
            .with({type: 'Boolean'}, c => {
                // TODO check if we need to do something
            })
            .exhaustive()
            
            

            // RIGHT
            if (condition.valueSet.right == null) {
                // find expression
                const link = edges.find(edge => edge.to.id == nodeId && edge.to.input == 3);
                
                if (link !== undefined) {
                    const [fromNodeId, fromOutput] = [link.from.id, link.from.output];
                    const fromNode = processed[fromNodeId]
                    statement += fromNode?.expressions[fromOutput]
                    
                }

            } else {
                if (condition.type == DVMType.String) {
                    statement += '"' + condition.valueSet.right + '"';
                } else {
                    statement += condition.valueSet.right;
                }
            }
            const outLinks = edges
                .filter(edge => edge.from.id == nodeId)
                .sort((e1, e2) => e1.from.output - e2.from.output);
            const [thenNodeId, _] = outLinks.map(edge => edge.to.id);



            statement += `) THEN GOTO ?${thenNodeId}`//TODO 
            statements.push(statement)
        })
        .with({ type: NodeDataKind.Process }, data => {
            const links = edges.filter(edge => edge.from.id == nodeId || edge.to.id == nodeId)
            const isExpressionUsed = edges.filter(edge => edge.from.id == nodeId && edge.type.type == 'value').length > 0;

            const inArgs = edges.filter(edge => edge.to.id == nodeId && edge.type.type == 'value')
            console.warn({ inArgs }); //! // TODO manage args 

            const expression = data.process.name + '(...)';
            if (isExpressionUsed) {
                expressions[links.length - 1] = expression;
            } else {
                statements.push(expression);
            }


        })

        // TODO continue implementation
        .otherwise(data => {
            statements.push(`// ignored : ${JSON.stringify(data)}`)
            lines += 1;
        })
    return { statements, expressions, lines, startLine: -1 };
}
