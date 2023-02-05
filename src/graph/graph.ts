import { atomWithImmer } from 'jotai-immer'
import { useAtom } from "jotai"
import { selectedFunctionAtom } from "../App"
import { hasSome, Some, unwrap } from "../utils/variants"
import { LinksReduce, linksImmerReducer } from "./links"
import { Node, NodeLink, NodeDataKind, NodesReduce, nodesImmerReducer, StringOperator, Uint64Operator, Uint64Comparator } from "./nodes"
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
    vars: {
        [name: string]: {
            type: DVMType
        }
    }
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
        vars: {},
        return: DVMType.Uint64,
    }
};


export const storageProjectAtom = atomWithStorage<Project>('current', { name: 'Initial Project', functions: initialFunctions });
export const projectOptionsAtom = atomWithImmer<ProjectOptions>({ name: 'Initial Project' });
export const functionsAtom = atomWithImmer<Functions>(initialFunctions);


export const useGraphAtomReducer = () => {
    const [functions, setFunctions] = useAtom(functionsAtom);
    let [selectedFunction, setSelectedFunction] = useAtom(selectedFunctionAtom);
    if (selectedFunction.type == 'None' || selectedFunction.type == 'Some' && !(unwrap(selectedFunction) in functions)) {
        selectedFunction = Some(Object.keys(functions)[0]);
        setSelectedFunction(selectedFunction);
    }

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

    const uint64Vars = Object.keys(functionData.vars).filter(k => functionData.vars[k].type == DVMType.Uint64)
    const stringVars = Object.keys(functionData.vars).filter(k => functionData.vars[k].type == DVMType.String)
    if (uint64Vars.length > 0) {
        output += `${line++}\tDIM ${uint64Vars.join(', ')} AS Uint64 ${newLine}`
    }
    if (stringVars.length > 0) {
        output += `${line++}\tDIM ${stringVars.join(', ')} AS String ${newLine}`
    }


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

    while (index >= 0) { // TODO do one lookup and replace strings in for loop
        index = output.indexOf('GOTO ?');

        if (index < 0) {
            break;
        } else {
            const endIndex = Math.min(
                output.slice(index).indexOf(' ', 'GOTO $'.length),
                output.slice(index).indexOf('\n', 'GOTO $'.length)
            )
            const foundGoto = output.slice(index, index + endIndex);
            const foundGotoStr = foundGoto.split('?')[1];
            const targetNode = Number(foundGotoStr);
            const replaced = output.slice(0, index) + `GOTO ${processed[targetNode]?.startLine}` + output.slice(index + endIndex)

            output = replaced;

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
            console.log('Function', data.function.name, {data});
            
            const args = argNames.map((name, index) => {
                // @ts-ignore //! what else ?
                const arg = data.function.args[name]

                const isVariable = arg.type == DVMType.Variable;
                const valueSet = isVariable ? arg.valueSet.valueSet : arg.valueSet;
                const valueType = isVariable ? arg.valueSet.type : arg.type;

                if (valueSet != null) {
                    return valueType == DVMType.String ? `"${valueSet}"` : valueSet;
                } else {
                    // find expression
                    const link = edges.find(edge => edge.to.id == nodeId && edge.to.input == (asProcess ? index + 2 : index));
                    
                    if (link !== undefined) {
                        const [fromNodeId, fromOutput] = [link.from.id, link.from.output];
                        const fromNode = processed[fromNodeId]
                        console.log({link, fromNode})
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
        .with({ type: NodeDataKind.Operation }, data => {


            const left = data.operation.valueSet.left;
            const right = data.operation.valueSet.right;
            const operator = data.operation.operator;
            let expression = '';
            let inout_index = 0;
            if (operator == Uint64Operator.BitwiseNot) {
                expression += '!'
            }

            if (left == null) {
                const link = edges.find(edge => edge.to.id == nodeId && edge.to.input == 0);
                if (link !== undefined) {
                    const [fromNodeId, fromOutput] = [link.from.id, link.from.output];
                    const fromNode = processed[fromNodeId]
                    if (fromNode != null) {
                        expression += fromNode.expressions[fromOutput]
                    }
                }
                inout_index += 1
            } else {
                if (data.operation.type == DVMType.String) {
                    expression += `"${left}"`;
                } else {
                    expression += left;
                }

            }

            if (operator != Uint64Operator.BitwiseNot) {
                expression += ' ' + operator + ' '
            }

            if (right == null && operator != Uint64Operator.BitwiseNot) {
                const link = edges.find(edge => edge.to.id == nodeId && edge.to.input == 1);
                if (link !== undefined) {
                    const [fromNodeId, fromOutput] = [link.from.id, link.from.output];
                    const fromNode = processed[fromNodeId]
                    if (fromNode != null) {
                        expression += fromNode.expressions[fromOutput]
                    }
                }
                inout_index += 1
            } else {
                if (data.operation.type == DVMType.String) {
                    expression += `"${right}"`;
                } else {
                    expression += right;
                }
            }

            expressions[operator == Uint64Operator.BitwiseNot ? 1 : 2] = expression
        })
        .with({ type: NodeDataKind.Let }, data => {
            //statements.push('DIM ' + data.dimlet.name + ' as ' + data.dimlet.return.type)
            if (data.let.in.valueSet == null) {
                // find expression
                const link = edges.find(edge => edge.to.id == nodeId && edge.to.input == 2);
                if (link !== undefined) {
                    const [fromNodeId, fromOutput] = [link.from.id, link.from.output];
                    const fromNode = processed[fromNodeId]
                    if (fromNode != null) {
                        statements.push('LET ' + data.let.name + ' = ' + fromNode.expressions[fromOutput])
                    }
                }
            } else {
                statements.push('LET ' + data.let.name + ' = ' + data.let.in.valueSet)
            }

            lines += 1;
        })
        .with({ type: NodeDataKind.Variable }, data => {
            edges.filter(edge => edge.from.id == nodeId).forEach(edge => {
                expressions[edge.from.output] = data.variable.name
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
        .with({ type: NodeDataKind.Control }, data => {
            // TODO adapt from  IF THEN ELSE
            let statement = 'IF (';

            // find expression
            const link = edges.find(edge => edge.to.id == nodeId && edge.to.input == 1);
            if (link !== undefined) {
                const [fromNodeId, fromOutput] = [link.from.id, link.from.output];
                const fromNode = processed[fromNodeId]
                if (fromNode != null) {
                    statement += fromNode.expressions[fromOutput]
                }
            }
            const outLinks = edges
                .filter(edge => edge.from.id == nodeId)
                .sort((e1, e2) => e1.from.output - e2.from.output);
            const [thenNodeId, elseNodeId] = outLinks.map(edge => edge.to.id);

            if (thenNodeId !== undefined) {
                statement += `) THEN GOTO ?${thenNodeId}`
                if (elseNodeId !== undefined && data.control.type == 'if-else') {
                    statement += ` ELSE GOTO ?${elseNodeId}`
                }
                statements.push(statement)
            }


        })
        .with({ type: NodeDataKind.Condition }, data => {
            const condition = data.condition;
            const left = condition.valueSet.left;
            const right = condition.valueSet.right;
            const operator = condition.operator;

            let expression = '';
            let inout_index = 0;

            if (left == null) {
                const link = edges.find(edge => edge.to.id == nodeId && edge.to.input == 0);
                if (link !== undefined) {
                    const [fromNodeId, fromOutput] = [link.from.id, link.from.output];
                    const fromNode = processed[fromNodeId]
                    if (fromNode != null) {
                        expression += fromNode.expressions[fromOutput]
                    }
                }
                inout_index += 1
            } else {
                if (condition.type == DVMType.String) {
                    expression += `"${left}"`;
                } else {
                    expression += left;
                }

            }

            expression += ' ' + operator + ' '

            if (right == null) {
                const link = edges.find(edge => edge.to.id == nodeId && edge.to.input == 1);
                if (link !== undefined) {
                    const [fromNodeId, fromOutput] = [link.from.id, link.from.output];
                    const fromNode = processed[fromNodeId]
                    if (fromNode != null) {
                        expression += fromNode.expressions[fromOutput]
                    }
                }
                inout_index += 1
            } else {
                if (condition.type == DVMType.String) {
                    expression += `"${right}"`;
                } else {
                    expression += right;
                }

            }

            expressions[1] = expression
        })
        .with({ type: NodeDataKind.Process }, data => {
            const links = edges.filter(edge => edge.from.id == nodeId || edge.to.id == nodeId)
            const isExpressionUsed = edges.filter(edge => edge.from.id == nodeId && edge.type.type == 'value').length > 0;

            const inArgs = edges.filter(edge => edge.to.id == nodeId && edge.type.type == 'value')
            const args = inArgs.map(link => {
                const [fromNodeId, fromOutput] = [link.from.id, link.from.output];
                const fromNode = processed[fromNodeId]
                if (fromNode != null) {
                    return fromNode.expressions[fromOutput]
                }
            })

            const expression = `${data.process.name}(${args.join(', ')})`;
            if (isExpressionUsed) {
                expressions[links.length - 1] = expression;
            } else {
                statements.push(expression);
            }


        })
        .otherwise(data => {
            statements.push(`// ignored : ${JSON.stringify(data)}`)
            lines += 1;
        })
    return { statements, expressions, lines, startLine: -1 };
}
