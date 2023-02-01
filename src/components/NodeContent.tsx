import { atom, useAtom } from "jotai"
import { useEffect, useState } from "react"
import { Button, Checkbox, IconButton, Input, InputGroup, Modal, SelectPicker, Stack } from "rsuite"
import { match } from "ts-pattern"
import { selectedFunctionAtom } from "../App"
import { DVM, DVMType, Uint64 } from "../dvm/types"
import { functionsAtom, useGraphAtomReducer } from "../graph/graph"
import { ConnectionData, NodeLinkTo, NodeLinkFrom, Connector, Position, NodeDataKind, EndNodeData, NodesAction, ProcessNodeData, ControlNodeData, FunctionNodeData, LetNodeData, VariableNodeData, StringComparator, Uint64Comparator, Let, OperationNodeData, Uint64Operator, StringOperator, Operation, isStringOperator, isUint64Operator, ConditionNodeData, isUint64Comparator, isStringComparator, } from "../graph/nodes"
import { colors } from "../utils/theme"
import { hasSome, unwrap } from "../utils/variants"
import { NodeConnector } from "./Connector"
import TrashIcon from '@rsuite/icons/Trash';

export const nodesConnectorPositionAtom = atom<{ [id: number]: ConnectionData }>({});
export const nodesConnectorPositionReducer = (
    current: { [id: number]: ConnectionData },
    action: ({ action: 'in', in: NodeLinkTo } | { action: 'out', out: NodeLinkFrom }) & { def: Connector, position: Position }
): { [id: number]: ConnectionData } => {

    return match(action)
        .with({ action: 'in' }, a => {
            if (!(a.in.id in current)) {
                current[a.in.id] = { inputs: [], outputs: [] }
            }
            let inputs = current[a.in.id].inputs;
            if (!(a.in.input in inputs)) {
                inputs[a.in.input] = { ...a.def, position: { x: 0, y: 0 } }
            }
            const input = inputs[a.in.input];
            inputs[a.in.input] = { ...input, position: a.position };
            return {
                ...current, [a.in.id]: {
                    inputs,
                    outputs: current[a.in.id].outputs,
                }
            };
        })
        .with({ action: 'out' }, a => {
            if (!(a.out.id in current)) {
                current[a.out.id] = { inputs: [], outputs: [] }
            }
            let outputs = current[a.out.id].outputs;
            if (!(a.out.output in outputs)) {
                outputs[a.out.output] = { ...a.def, position: { x: 0, y: 0 } }
            }
            const output = outputs[a.out.output];
            outputs[a.out.output] = { ...output, position: a.position };
            return {
                ...current, [a.out.id]: {
                    inputs: current[a.out.id].inputs,
                    outputs,
                }
            };

        })
        .exhaustive()

};

export const NodeContent = ({ id }: { id: number }) => {

    const { nodes } = useGraphAtomReducer();
    const node = nodes[id];
    const nodeData = node.data;


    return match(nodeData)
        .with({ type: NodeDataKind.Start }, _ =>
            <StartNode id={id} />
        )
        .with({ type: NodeDataKind.End }, ({ end }) =>
            <EndNode id={id} end={end} />
        )
        .with({ type: NodeDataKind.Process }, ({ process }) =>
            <ProcessNode id={id} process={process} />
        )
        .with({ type: NodeDataKind.Control }, ({ control }) =>
            <ControlNode id={id} control={control} />
        )
        .with({ type: NodeDataKind.Condition }, ({ condition }) =>
            <ConditionNode id={id} condition={condition} />
        )
        .with({ type: NodeDataKind.Function }, ({ function: _function }) =>
            <FunctionNode id={id} function={_function} />
        )
        .with({ type: NodeDataKind.Operation }, ({ operation }) =>
            <OperationNode id={id} operation={operation} />
        )
        .with({ type: NodeDataKind.Let }, ({ let: _let }) =>
            <LetNode id={id} let={_let} />
        )
        .with({ type: NodeDataKind.Variable }, ({ variable }) =>
            <VariableNode id={id} variable={variable} />
        )
        .with({ type: NodeDataKind.Goto }, _ =>
            <GotoNode id={id} />
        )
        .with({ type: NodeDataKind.Argument }, data =>
            <ArgumentNode id={id} name={data.name} />
        )
        .exhaustive()
}


const Separator = () => <div style={{ width: '100%', margin: '.5em 0', borderTop: '1px solid ' + colors.whiteAlpha(200) }}></div>

const styles = {
    row: { display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: '1em' }
}

export const StartNode = ({ id }: { id: number }) => {

    const [functions, setFunctions] = useAtom(functionsAtom);
    const [selectedFunction] = useAtom(selectedFunctionAtom);

    const existingArgs = Object.entries(functions[unwrap(selectedFunction)].args).map(e => ({ name: e[0], type: e[1].type }));
    const existingVars = Object.entries(functions[unwrap(selectedFunction)].vars).map(e => ({ name: e[0], type: e[1].type }));



    const [args, setArgs] = useState(existingArgs);
    useEffect(() => {
        setArgs(existingArgs)
    }, [functions]);

    const [vars, setVars] = useState(existingVars);
    useEffect(() => {
        setVars(existingVars)
    }, [functions]);

    const [returnType, setReturnType] = useState(functions[unwrap(selectedFunction)].return);
    useEffect(() => {
        setReturnType(functions[unwrap(selectedFunction)].return)
    }, [functions]);



    const types: { label: DVMType, value: DVMType }[] = [
        { label: DVMType.String, value: DVMType.String },
        { label: DVMType.Uint64, value: DVMType.Uint64 },
    ]
    const { nodes, updateNodes } = useGraphAtomReducer();
    const edit = nodes[id].edit;
    const close = () => {
        updateNodes({
            action: NodesAction.UpdateNodeEditMode,
            data: { id, edit: false }
        })
        setArgs(existingArgs);
    }

    const modal = <Modal size={'xs'} open={edit} onClose={close}>
        <Modal.Header>
            <Modal.Title>{unwrap(selectedFunction)} Settings</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            <Stack direction="column" alignItems="flex-start" spacing={16}>
                <h6>Arguments</h6>
                {args.map((arg, index) => <InputGroup key={index}>
                    <Input placeholder="Name" value={arg.name} onChange={(value) => {
                        setArgs(args.map((a, i) => i == index ? { ...a, name: value } : a))
                    }} />

                    <SelectPicker data={types} defaultValue={arg.type} onChange={(value) => {
                        if (value != null) {
                            setArgs(args.map((a, i) => i == index ? { ...a, type: value } : a))
                        }
                    }} />
                    <IconButton onClick={() => { setArgs(args.filter((_, i) => index != i)) }} icon={<TrashIcon />} />
                </InputGroup>)}

                <Button onClick={() => {
                    setArgs([...args, { name: '', type: DVMType.Uint64 }])
                }} style={{ width: '100%' }}>Add</Button>



                <h6>Variables</h6>
                {vars.map((_var, index) => <InputGroup key={index}>
                    <Input placeholder="Name" value={_var.name} onChange={(value) => {
                        setVars(vars.map((v, i) => i == index ? { ...v, name: value } : v))
                    }} />

                    <SelectPicker data={types} defaultValue={_var.type} onChange={(value) => {
                        if (value != null) {
                            setVars(vars.map((v, i) => i == index ? { ...v, type: value } : v))
                        }
                    }} />
                    <IconButton onClick={() => { setVars(vars.filter((_, i) => index != i)) }} icon={<TrashIcon />} />
                </InputGroup>)}

                <Button onClick={() => {
                    setVars([...vars, { name: '', type: DVMType.Uint64 }])
                }} style={{ width: '100%' }}>Add</Button>




                <h6>Return Type</h6>
                <SelectPicker data={types} defaultValue={functions[unwrap(selectedFunction)].return} onChange={(value) => {
                    if (value != null) {
                        setReturnType(value);
                    }
                }} style={{ width: '100%' }} />


            </Stack>


        </Modal.Body>
        <Modal.Footer>
            <Button onClick={close} appearance="subtle">
                Cancel
            </Button>
            <Button onClick={() => {
                setFunctions((draft) => {
                    let newArgs: { [name: string]: { type: DVMType } } = {};
                    args.forEach(arg => {
                        newArgs[arg.name] = { type: arg.type }
                    })

                    let newVars: { [name: string]: { type: DVMType } } = {};
                    vars.forEach(v => {
                        newVars[v.name] = { type: v.type }
                    })

                    draft[unwrap(selectedFunction)].args = newArgs;
                    draft[unwrap(selectedFunction)].vars = newVars;
                    draft[unwrap(selectedFunction)].return = returnType;
                });
                close();
            }
            } appearance="primary">
                Ok
            </Button>
        </Modal.Footer>
    </Modal>

    return <>

        <div style={{ ...styles.row, marginBottom: '.5em' }}>
            <div></div>
            <NodeConnector
                id={id}
                inout={0}
                size={12}
                color={colors.whiteAlpha(400)}
                type={{ type: 'flow' }}
                way='out' />
        </div>
        <Separator />
        {existingArgs.map((arg, index) =>
            <div key={index} style={styles.row}>
                <div>{arg.name}</div>
                <NodeConnector
                    id={id}
                    inout={1}
                    size={12}
                    color={arg.type == DVMType.Uint64 ? colors.numericType(600) : colors.stringType(600)}
                    type={{ type: 'value', valueType: arg.type }}
                    way='out' />
            </div>
        )}

        {edit ? modal : null}
    </>
}

export const GotoNode = ({ id }: { id: number }) => {

    return <>
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <NodeConnector
                id={id}
                inout={0}
                size={12}
                color={colors.whiteAlpha(400)}
                type={{ type: 'flow' }}
                way='in' />
            <NodeConnector
                id={id}
                inout={1}
                size={12}
                color={colors.whiteAlpha(400)}
                type={{ type: 'flow' }}
                way='out' />
        </div>
    </>
}

export const ArgumentNode = ({ id, name }: { id: number, name: string }) => {
    const [functions, setFunctions] = useAtom(functionsAtom);
    const [selectedFunction] = useAtom(selectedFunctionAtom);

    const args = functions[unwrap(selectedFunction)].args;
    const arg = args[name];
    const { nodes, updateNodes } = useGraphAtomReducer();

    const edit = nodes[id].edit;

    return <>

        <div style={styles.row}>
            {edit
                ? <SelectPicker data={Object.keys(args).map(k => ({ label: k, value: k }))} defaultValue={name} onChange={(value) => {
                    if (value != null) {
                        updateNodes({
                            action: NodesAction.EditNode,
                            data: { id, newData: { type: NodeDataKind.Argument, name: value } }
                        })
                    }
                }} />
                : <div>{name}</div>}
            <NodeConnector
                id={id}
                inout={0}
                size={12}
                color={arg.type == DVMType.String ? colors.stringType(500) : arg.type == DVMType.Uint64 ? colors.numericType(500) : colors.whiteAlpha(400)}
                type={{ type: 'value', valueType: arg.type }}
                way='out' />
        </div>
    </>
}

export const EndNode = ({ id, end }: { id: number } & EndNodeData) => {
    const { nodes, updateNodes } = useGraphAtomReducer();
    const edit = nodes[id].edit;

    type EndNodeType = 'return' | 'panic';
    const types: { label: string, value: EndNodeType }[] = [
        { label: 'Return', value: 'return' },
        { label: 'Panic', value: 'panic' },
    ]
    const returnTypes: { label: DVMType, value: DVMType }[] = [
        { label: DVMType.String, value: DVMType.String },
        { label: DVMType.Uint64, value: DVMType.Uint64 },
    ]

    return <>
        {
            !edit ? null : <>
                <SelectPicker placeholder='Type' data={types} defaultValue={end.type} style={{ width: '100%' }}
                    onChange={(value) => {
                        match(value)
                            .with('panic', _ =>
                                updateNodes({
                                    action: NodesAction.EditNode,
                                    data: {
                                        id,
                                        newData: {
                                            type: NodeDataKind.End,
                                            end: { type: 'panic' },
                                        },
                                    }
                                }))
                            .with('return', _ =>
                                updateNodes({
                                    action: NodesAction.EditNode,
                                    data: {
                                        id,
                                        newData: {
                                            type: NodeDataKind.End,
                                            end: { type: 'return', returnType: DVMType.Uint64, value: 0 },
                                        },
                                    }
                                }))
                            .with(null, _ => { })
                            .exhaustive()
                    }} />

                {
                    match(end)
                        .with({ type: 'return' }, r => <>
                            <div style={styles.row}>
                                <SelectPicker data={returnTypes} defaultValue={r.returnType} style={{ width: '100%' }}
                                    onChange={(value) => {
                                        match(value)
                                            .with(DVMType.String, returnType => {
                                                updateNodes({
                                                    action: NodesAction.EditNode,
                                                    data: {
                                                        id,
                                                        newData: {
                                                            type: NodeDataKind.End,
                                                            end: { type: 'return', returnType, value: '' },
                                                        },
                                                    }
                                                })
                                            })
                                            .with(DVMType.Uint64, returnType => {
                                                updateNodes({
                                                    action: NodesAction.EditNode,
                                                    data: {
                                                        id,
                                                        newData: {
                                                            type: NodeDataKind.End,
                                                            end: { type: 'return', returnType, value: 0 },
                                                        },
                                                    }
                                                })
                                            })
                                            .otherwise(_ => { })
                                    }} />
                            </div>
                            <div style={styles.row}>
                                <Checkbox checked={r.value != null} onChange={(_, checked) => {
                                    updateNodes({
                                        action: NodesAction.EditNode,
                                        data: {
                                            id,
                                            newData: {
                                                type: NodeDataKind.End,
                                                end: (r.returnType == DVMType.Uint64
                                                    ? { type: 'return', returnType: DVMType.Uint64, value: checked ? 0 : null }
                                                    : { type: 'return', returnType: DVMType.String, value: checked ? '' : null }
                                                )
                                            },
                                        }
                                    })
                                }} />
                                <Input
                                    min={0}
                                    type="number"
                                    value={String(r.value)}
                                    onChange={(value) => {
                                        if (value != null) {
                                            const inputValue = Number(value)


                                            if (inputValue >= 0) {
                                                updateNodes({
                                                    action: NodesAction.EditNode,
                                                    data: {
                                                        id,
                                                        newData: {
                                                            type: NodeDataKind.End,
                                                            end: (r.returnType == DVMType.Uint64
                                                                ? { type: 'return', returnType: DVMType.Uint64, value: inputValue }
                                                                : { type: 'return', returnType: DVMType.String, value: value }
                                                            )
                                                        },
                                                    }
                                                })
                                            }
                                        }
                                    }} />
                            </div>
                        </>)
                        .otherwise(_ => { })

                }
            </>
        }
        <div style={styles.row}>
            <NodeConnector
                id={id}
                inout={0}
                size={12}
                color={colors.whiteAlpha(400)}
                type={{ type: 'flow' }}
                way='in' />

            <span style={{ margin: '0 .5em' }}>{end.type}</span>
            {end.type == 'return' && end.value != null ? <span style={{ margin: '0 .5em' }}>
                {end.returnType == DVMType.String ? '"' + end.value + '"' : end.value}
            </span> : <></>}

        </div>
        {end.type == 'return' && end.value == null
            ? <div style={styles.row}>
                <NodeConnector
                    id={id}
                    inout={1}
                    size={12}
                    color={end.returnType == 'String' ? colors.stringType(500) : colors.numericType(500)}
                    type={{ type: 'value', valueType: end.returnType }}
                    way='in' />
                value
            </div>
            : <></>}


    </>
}

export const ProcessNode = ({ id, process }: { id: number } & ProcessNodeData) => {
    const { nodes } = useGraphAtomReducer();
    const node = nodes[id];
    const edit = node.edit;
    const [functions, setFunctions] = useAtom(functionsAtom);
    const [selectedFunction] = useAtom(selectedFunctionAtom);

    const f = functions[process.name]
    const args = f.args;
    const argList = Object.keys(args);

    return <>
        <div style={styles.row}>
            <NodeConnector
                id={id}
                inout={0}
                size={12}
                color={colors.whiteAlpha(400)}
                type={{ type: 'flow' }}
                way='in' />
            {process.name}
            <NodeConnector
                id={id}
                inout={1}
                size={12}
                color={colors.whiteAlpha(400)}
                type={{ type: 'flow' }}
                way='out' />
        </div>

        {argList.map((argName, index) => {
            const arg = args[argName];
            return <div key={index} style={styles.row}>
                <NodeConnector
                    id={id}
                    inout={2 + index}
                    size={12}
                    color={arg.type == DVMType.Uint64 ? colors.numericType(500) : arg.type == DVMType.String ? colors.stringType(500) : colors.whiteAlpha(400)}
                    type={{ type: 'value', valueType: arg.type }}
                    way='in' />
                {argName}
            </div>
        })}

        <div style={styles.row}>
            <div>output</div>
            <NodeConnector
                id={id}
                inout={2 + argList.length}
                size={12}
                color={f.return == DVMType.Uint64 ? colors.numericType(500) : f.return == DVMType.String ? colors.stringType(500) : colors.whiteAlpha(400)}
                type={{ type: 'value', valueType: f.return }}
                way='out' />
        </div>
    </>
}

export const ControlNode = ({ id, control }: { id: number } & ControlNodeData) => {
    const { nodes, updateNodes } = useGraphAtomReducer();
    const node = nodes[id];
    const edit = node.edit;

    const types = [
        { label: 'If - Then', value: 'if' },
        { label: 'If - Then - Else', value: 'if-else' }
    ]

    return <>
        <div style={styles.row}>
            <NodeConnector
                id={id}
                inout={0}
                size={12}
                color={colors.whiteAlpha(400)}
                type={{ type: 'flow' }}
                way='in' />
            {control.type}
        </div>
        <div style={styles.row}>
            <NodeConnector
                id={id}
                inout={1}
                size={12}
                color={colors.numericType(500)}
                type={{ type: 'value', valueType: DVMType.Uint64 }}
                way='in' />
            condition
        </div>
        <Separator />
        {edit ? <div style={styles.row}>
            <SelectPicker data={types} value={control.type} style={{width: '100%'}}
            onChange={(value) => { 
                if (value == 'if' || value == 'if-else') {
                    updateNodes({
                        action: NodesAction.EditNode,
                        data: {
                            id,
                            newData: {
                                type: NodeDataKind.Control,
                                control: {
                                    ...control,
                                    type: value
                                }
                            }
                        }
                    })
                }
            }} />
        </div> : null}
        {['then', (control.type == 'if' ? 'continue' : 'else')].map((outName, index) =>
            <div key={outName} style={styles.row}>
                {outName}
                <NodeConnector
                    id={id}
                    inout={2 + index}
                    size={12}
                    color={colors.whiteAlpha(400)}
                    type={{ type: 'flow' }}
                    way='out' />
            </div>
        )

        }

    </>
}

export const FunctionNode = ({ id, function: _function }: { id: number } & FunctionNodeData) => {
    const { nodes, updateNodes } = useGraphAtomReducer();
    const node = nodes[id];
    const edit = node.edit;
    const nodeWidth = 128;
    const args = _function.args;
    const arg_names: string[] = Object.keys(args);
    const asProcess = 'asProcess' in _function && _function.asProcess;
    const types = [{ label: DVMType.String, value: DVMType.String }, { label: `${DVMType.Uint64} / Boolean`, value: DVMType.Uint64 }]

    return <>
        {asProcess
            ? <div style={styles.row}>
                <NodeConnector
                    id={id}
                    inout={0}
                    size={12}
                    color={colors.whiteAlpha(400)}
                    type={{ type: 'flow' }}
                    way='in' />
                {_function.name}
                <NodeConnector
                    id={id}
                    inout={1}
                    size={12}
                    color={colors.whiteAlpha(400)}
                    type={{ type: 'flow' }}
                    way='out' />
            </div>
            : <div style={{ ...styles.row, minWidth: `${nodeWidth}px`, }}>
                {_function.name}
            </div>}
        <Separator />
        {!edit
            ? arg_names.map((arg_key: string, index) => {

                if (arg_key in args) {
                    // @ts-ignore
                    const arg = args[arg_key];

                    // check set type for variable
                    const valueType = arg.type == DVMType.Variable ? arg.valueSet.type : arg.type;
                    const valueSet = arg.type == DVMType.Variable ? arg.valueSet.valueSet : arg.valueSet;

                    return <div key={index} style={styles.row}>
                        {valueSet == null ?
                            <NodeConnector
                                id={id}
                                inout={asProcess ? 2 + index : index}
                                size={12}
                                color={valueType == DVMType.String ? colors.stringType(500) : valueType == DVMType.Uint64 ? colors.numericType(500) : colors.whiteAlpha(500)}
                                type={{ type: 'value', valueType: valueType }}
                                way='in' /> : <div>{valueSet}</div>}
                        {arg_key}
                    </div>

                }

            })
            : arg_names.map((arg_key: string, index) => {
                // @ts-ignore
                const arg = args[arg_key];

                const isVariable = arg.type == DVMType.Variable;
                const valueType = isVariable ? arg.valueSet.type : arg.type;



                return <div key={index} style={{ ...styles.row, gap: 0 }}>
                    <Checkbox checked={(isVariable ? arg.valueSet.valueSet : arg.valueSet) != null} onChange={(_, checked) => {
                        const newValue = valueType == DVMType.Uint64 ? 0 : 'value';
                        const newValueSet = isVariable ? { type: valueType, valueSet: checked ? newValue : null } : checked ? newValue : null;
                        updateNodes({
                            action: NodesAction.EditNodeArgValue,
                            data: {
                                id,
                                arg: arg_key,
                                valueSet: newValueSet,
                            }
                        })
                    }} />
                    <div>
                        <Input
                            disabled={(isVariable ? arg.valueSet.valueSet : arg.valueSet) == null}
                            placeholder={arg_key}
                            type={valueType == DVMType.Uint64 ? 'number' : 'text'}
                            value={isVariable ? (arg.valueSet.valueSet == null ? '' : arg.valueSet.valueSet) : arg.valueSet == null ? '' : arg.valueSet}
                            onChange={(value) => {
                                if ((isVariable ? arg.valueSet.valueSet : arg.valueSet) != null) {
                                    const newValueSet = isVariable ? { type: valueType, valueSet: value } : value
                                    updateNodes({
                                        action: NodesAction.EditNodeArgValue,
                                        data: {
                                            id,
                                            arg: arg_key,
                                            valueSet: newValueSet,
                                        }
                                    })
                                }
                            }}
                        />
                        {isVariable
                            ? <SelectPicker data={types} defaultValue={valueType} style={{ width: '100%' }}
                                onChange={(t) => {
                                    if (t != null) {
                                        updateNodes({
                                            action: NodesAction.EditNode,
                                            data: {
                                                id,
                                                newData: {
                                                    type: NodeDataKind.Function,
                                                    // @ts-ignore
                                                    function: {
                                                        ..._function,
                                                        args: {
                                                            ..._function.args,
                                                            [arg_key]: {
                                                                type: DVMType.Variable,
                                                                valueSet: {
                                                                    type: t,
                                                                    valueSet: null
                                                                }
                                                            }
                                                        }
                                                    }

                                                }
                                            }
                                        })
                                    }
                                }}
                            />
                            : null}
                    </div>
                </div>
            })
        }
        <Separator />
        {
            <div style={styles.row}>
                output
                <NodeConnector
                    id={id}
                    inout={(asProcess ? 2 : 0) + arg_names.length}
                    size={12}
                    color={_function.return == DVMType.String ? colors.stringType(500) : _function.return == DVMType.Uint64 ? colors.numericType(500) : colors.whiteAlpha(400)}
                    type={{ type: 'value', valueType: _function.return }}
                    way='out' />
            </div>


        }

    </>
}

export const OperationNode = ({ id, operation }: { id: number } & OperationNodeData) => {
    const { nodes, updateNodes } = useGraphAtomReducer();
    const node = nodes[id];
    const edit = node.edit;

    const types = [{ label: DVMType.String, value: DVMType.String }, { label: `${DVMType.Uint64} / Boolean`, value: DVMType.Uint64 }]
    const uint64OperatorMap: { [op in Uint64Operator]: string } = {
        [Uint64Operator.Add]: 'Add',
        [Uint64Operator.Subtract]: 'Subtract',
        [Uint64Operator.Multiply]: 'Multiply',
        [Uint64Operator.Divide]: 'Divide',
        [Uint64Operator.Modulo]: 'Modulo',
        [Uint64Operator.BitwiseAnd]: 'BitwiseAnd',
        [Uint64Operator.BitwiseOr]: 'BitwiseOr',
        [Uint64Operator.BitwiseXOr]: 'BitwiseXOr',
        [Uint64Operator.BitwiseNot]: 'BitwiseNot',
        [Uint64Operator.BitwiseRightShift]: 'BitwiseRightShift',
        [Uint64Operator.BitwiseLeftShift]: 'BitwiseLeftShift'
    };
    const stringOperatorMap: { [op in StringOperator]: string } = {
        [StringOperator.Concatenate]: 'Concatenate',
    };
    const operators = operation.type == DVMType.Uint64
        ? Object.entries(uint64OperatorMap).map(([op, _op]) => {
            const oper: Uint64Operator = Uint64Operator[_op as keyof typeof Uint64Operator];
            return { label: `${op} (${_op})`, value: oper }
        })
        : Object.entries(stringOperatorMap).map(([op, _op]) => {
            const oper: StringOperator = StringOperator[_op as keyof typeof StringOperator];
            return { label: `${op} (${_op})`, value: oper }
        })


    const color = operation.type == DVMType.Uint64 ? colors.numericType(500) : operation.type == DVMType.String ? colors.stringType(500) : colors.whiteAlpha(400);
    return <>

        {!edit ? <>
            <div style={styles.row}>
                {operation.valueSet.left == null
                    ? <><NodeConnector
                        id={id}
                        inout={0}
                        size={12}
                        color={color}
                        type={{ type: 'value', valueType: operation.type }}
                        way='in' /> value</>
                    : <><div></div>{operation.valueSet.left}</>
                }

            </div>
            <div style={styles.row}>
                <div></div> <h5>{operation.operator}</h5>
            </div>
            {operation.operator != Uint64Operator.BitwiseNot ?
                <div style={styles.row}>
                    {operation.valueSet.right == null
                        ? <><NodeConnector
                            id={id}
                            inout={1}
                            size={12}
                            color={color}
                            type={{ type: 'value', valueType: operation.type }}
                            way='in' /> value</>
                        : <><div></div>{operation.valueSet.right}</>
                    }
                </div> : null}
        </> : <>
            <div style={{ ...styles.row, width: '100%' }}>
                <SelectPicker data={types} defaultValue={operation.type} style={{ width: '100%' }}
                    onChange={(value) => {
                        match(value)
                            .with(DVMType.Uint64, t => {
                                updateNodes({
                                    action: NodesAction.EditNode,
                                    data: {
                                        id,
                                        newData: {
                                            type: NodeDataKind.Operation,
                                            operation: {
                                                type: t,
                                                operator: Uint64Operator.Add,
                                                valueSet: { left: null, right: null }
                                            }

                                        }
                                    }
                                })
                            })
                            .with(DVMType.String, t => {
                                updateNodes({
                                    action: NodesAction.EditNode,
                                    data: {
                                        id,
                                        newData: {
                                            type: NodeDataKind.Operation,
                                            operation: {
                                                type: t,
                                                operator: StringOperator.Concatenate,
                                                valueSet: { left: null, right: null }
                                            }

                                        }
                                    }
                                })
                            })
                            .otherwise(_ => { })
                    }} />
            </div>

            <div style={{ ...styles.row, width: '100%', gap: 0 }}>
                <Checkbox checked={operation.valueSet.left != null} onChange={(_, checked) => {
                    updateNodes({
                        action: NodesAction.EditNodeArgValue,
                        data: { id, arg: 'left', valueSet: checked ? operation.type == DVMType.Uint64 ? 0 : '' : null }
                    })
                }} />
                <Input value={operation.valueSet.left == null ? undefined : operation.valueSet.left} type={operation.type == DVMType.Uint64 ? 'number' : 'text'}
                    onChange={(value) => {
                        const v = operation.type == DVMType.Uint64 ? value == '' ? null : Number(value) : value;
                        updateNodes({
                            action: NodesAction.EditNodeArgValue,
                            data: { id, arg: 'left', valueSet: v }
                        })
                    }} />
            </div>

            <div style={{ ...styles.row, width: '100%' }}>
                <SelectPicker data={operators} defaultValue={operation.operator} style={{ width: '100%' }}
                    onChange={(value) => {
                        if (value != null) {
                            if (isUint64Operator(value) && operation.type == DVMType.Uint64) {

                                updateNodes({
                                    action: NodesAction.EditNode,
                                    data: {
                                        id,
                                        newData: {
                                            type: NodeDataKind.Operation,
                                            operation: {
                                                type: operation.type,
                                                operator: value,
                                                valueSet: { left: null, right: null }
                                            }

                                        }
                                    }
                                })
                            } else if (isStringOperator(value) && operation.type == DVMType.String) {
                                updateNodes({
                                    action: NodesAction.EditNode,
                                    data: {
                                        id,
                                        newData: {
                                            type: NodeDataKind.Operation,
                                            operation: {
                                                type: operation.type,
                                                operator: value,
                                                valueSet: { left: null, right: null }
                                            }

                                        }
                                    }
                                })
                            }

                        }
                    }} />
            </div>

            {operation.operator != Uint64Operator.BitwiseNot ?
                <div style={{ ...styles.row, width: '100%', gap: 0 }}>
                    <Checkbox checked={operation.valueSet.right != null} onChange={(_, checked) => {
                        updateNodes({
                            action: NodesAction.EditNodeArgValue,
                            data: { id, arg: 'right', valueSet: checked ? operation.type == DVMType.Uint64 ? 0 : '' : null }
                        })
                    }} />
                    <Input value={operation.valueSet.right == null ? undefined : operation.valueSet.right} type={operation.type == DVMType.Uint64 ? 'number' : 'text'}
                        onChange={(value) => {
                            const v = operation.type == DVMType.Uint64 ? value == '' ? null : Number(value) : value;
                            updateNodes({
                                action: NodesAction.EditNodeArgValue,
                                data: { id, arg: 'right', valueSet: v }
                            })
                        }} />
                </div>
                : null}
        </>}
        <Separator />
        <div style={styles.row}>
            <div>output</div>
            <NodeConnector
                id={id}
                inout={1}
                size={12}
                color={color}
                type={{ type: 'value', valueType: operation.type }}
                way='out' />
        </div>
    </>
}

export const ConditionNode = ({ id, condition }: { id: number } & ConditionNodeData) => {
    const { nodes, updateNodes } = useGraphAtomReducer();
    const node = nodes[id];
    const edit = node.edit;

    const types = [{ label: DVMType.String, value: DVMType.String }, { label: `${DVMType.Uint64} / Boolean`, value: DVMType.Uint64 }]
    const uint64ComparatorMap: { [op in Uint64Comparator]: string } = {
        [Uint64Comparator.Equals]: "Equals",
        [Uint64Comparator.Greater]: "Greater",
        [Uint64Comparator.GreaterOrEquals]: "GreaterOrEquals",
        [Uint64Comparator.Lower]: "Lower",
        [Uint64Comparator.LowerOrEquals]: "LowerOrEquals",
        [Uint64Comparator.Differs]: "Differs",
    };
    const stringComparatorMap: { [op in StringComparator]: string } = {
        [StringComparator.Equals]: "Equals",
        [StringComparator.Different]: "Different"
    };
    const operators = condition.type == DVMType.Uint64
        ? Object.entries(uint64ComparatorMap).map(([op, _op]) => {
            const oper: Uint64Comparator = Uint64Comparator[_op as keyof typeof Uint64Comparator];
            return { label: `${op} (${_op})`, value: oper }
        })
        : Object.entries(stringComparatorMap).map(([op, _op]) => {
            const oper: StringComparator = StringComparator[_op as keyof typeof StringComparator];
            return { label: `${op} (${_op})`, value: oper }
        })


    const color = condition.type == DVMType.Uint64 ? colors.numericType(500) : condition.type == DVMType.String ? colors.stringType(500) : colors.whiteAlpha(400);
    return <>

        {!edit ? <>
            <div style={styles.row}>
                {condition.valueSet.left == null
                    ? <><NodeConnector
                        id={id}
                        inout={0}
                        size={12}
                        color={color}
                        type={{ type: 'value', valueType: condition.type }}
                        way='in' /> value</>
                    : <><div></div>{condition.valueSet.left}</>
                }

            </div>
            <div style={styles.row}>
                <div></div> <h5>{condition.operator}</h5>
            </div>

            <div style={styles.row}>
                {condition.valueSet.right == null
                    ? <><NodeConnector
                        id={id}
                        inout={1}
                        size={12}
                        color={color}
                        type={{ type: 'value', valueType: condition.type }}
                        way='in' /> value</>
                    : <><div></div>{condition.valueSet.right}</>
                }
            </div>
        </> : <>
            <div style={{ ...styles.row, width: '100%' }}>
                <SelectPicker data={types} defaultValue={condition.type} style={{ width: '100%' }}
                    onChange={(value) => {
                        match(value)
                            .with(DVMType.Uint64, t => {
                                updateNodes({
                                    action: NodesAction.EditNode,
                                    data: {
                                        id,
                                        newData: {
                                            type: NodeDataKind.Condition,
                                            condition: {
                                                type: t,
                                                operator: Uint64Comparator.Equals,
                                                valueSet: { left: null, right: null }
                                            }

                                        }
                                    }
                                })
                            })
                            .with(DVMType.String, t => {
                                updateNodes({
                                    action: NodesAction.EditNode,
                                    data: {
                                        id,
                                        newData: {
                                            type: NodeDataKind.Condition,
                                            condition: {
                                                type: t,
                                                operator: StringComparator.Equals,
                                                valueSet: { left: null, right: null }
                                            }

                                        }
                                    }
                                })
                            })
                            .otherwise(_ => { })
                    }} />
            </div>

            <div style={{ ...styles.row, width: '100%', gap: 0 }}>
                <Checkbox checked={condition.valueSet.left != null} onChange={(_, checked) => {
                    updateNodes({
                        action: NodesAction.EditNodeArgValue,
                        data: { id, arg: 'left', valueSet: checked ? condition.type == DVMType.Uint64 ? 0 : '' : null }
                    })
                }} />
                <Input value={condition.valueSet.left == null ? undefined : condition.valueSet.left} type={condition.type == DVMType.Uint64 ? 'number' : 'text'}
                    onChange={(value) => {
                        const v = condition.type == DVMType.Uint64 ? value == '' ? null : Number(value) : value;
                        updateNodes({
                            action: NodesAction.EditNodeArgValue,
                            data: { id, arg: 'left', valueSet: v }
                        })
                    }} />
            </div>

            <div style={{ ...styles.row, width: '100%' }}>
                <SelectPicker data={operators} defaultValue={condition.operator} style={{ width: '100%' }}
                    onChange={(value) => {
                        if (value != null) {
                            if (isUint64Comparator(value) && condition.type == DVMType.Uint64) {

                                updateNodes({
                                    action: NodesAction.EditNode,
                                    data: {
                                        id,
                                        newData: {
                                            type: NodeDataKind.Condition,
                                            condition: {
                                                type: condition.type,
                                                operator: value,
                                                valueSet: { left: null, right: null }
                                            }

                                        }
                                    }
                                })
                            } else if (isStringComparator(value) && condition.type == DVMType.String) {
                                updateNodes({
                                    action: NodesAction.EditNode,
                                    data: {
                                        id,
                                        newData: {
                                            type: NodeDataKind.Condition,
                                            condition: {
                                                type: condition.type,
                                                operator: value,
                                                valueSet: { left: null, right: null }
                                            }

                                        }
                                    }
                                })
                            }

                        }
                    }} />
            </div>


            <div style={{ ...styles.row, width: '100%', gap: 0 }}>
                <Checkbox checked={condition.valueSet.right != null} onChange={(_, checked) => {
                    updateNodes({
                        action: NodesAction.EditNodeArgValue,
                        data: { id, arg: 'right', valueSet: checked ? condition.type == DVMType.Uint64 ? 0 : '' : null }
                    })
                }} />
                <Input value={condition.valueSet.right == null ? undefined : condition.valueSet.right} type={condition.type == DVMType.Uint64 ? 'number' : 'text'}
                    onChange={(value) => {
                        const v = condition.type == DVMType.Uint64 ? value == '' ? null : Number(value) : value;
                        updateNodes({
                            action: NodesAction.EditNodeArgValue,
                            data: { id, arg: 'right', valueSet: v }
                        })
                    }} />
            </div>

        </>}
        <Separator />
        <div style={styles.row}>
            <div>output</div>
            <NodeConnector
                id={id}
                inout={1}
                size={12}
                color={colors.numericType(500)}
                type={{ type: 'value', valueType: DVMType.Uint64 }}
                way='out' />
        </div>
    </>
}

export const LetNode = ({ id, let: _let }: { id: number } & LetNodeData) => {
    const { nodes, updateNodes } = useGraphAtomReducer();
    const node = nodes[id];
    const edit = node.edit;
    const nodeWidth = 128;

    const [functions, setFunctions] = useAtom(functionsAtom);
    const [selectedFunction] = useAtom(selectedFunctionAtom);
    const vars = functions[unwrap(selectedFunction)].vars;
    const declaredVariables: { label: string, value: string, type: DVMType }[] = Object.entries(vars).map(([k, v]) => ({ label: k, value: k, type: v.type }));

    return <>
        <div style={styles.row}>
            <NodeConnector
                id={id}
                inout={0}
                size={12}
                color={colors.whiteAlpha(400)}
                type={{ type: 'flow' }}
                way='in' />

            <NodeConnector
                id={id}
                inout={1}
                size={12}
                color={colors.whiteAlpha(400)}
                type={{ type: 'flow' }}
                way='out' />
        </div>
        <Separator />
        {edit ? <>

            <div style={{ ...styles.row, minWidth: `${nodeWidth}px`, }}>
                <SelectPicker data={declaredVariables} defaultValue={declaredVariables.length == 0 ? '' : declaredVariables[0].value} style={{ width: '100%' }}
                    onChange={(value) => {
                        if (value != null) {
                            const t = declaredVariables.find(v => v.value == value)?.type
                            if (t !== undefined && t != DVMType.Variable) {
                                updateNodes({
                                    action: NodesAction.EditNode,
                                    data: {
                                        id,
                                        newData: {
                                            type: NodeDataKind.Let,
                                            let: {
                                                name: value,
                                                in: {
                                                    type: t,
                                                    valueSet: null
                                                }
                                            }

                                        }
                                    }
                                })
                            }

                        }
                    }} />
            </div>
            <div style={{ ...styles.row, minWidth: `${nodeWidth}px`, }}>
                <Input
                    placeholder={'value'}
                    type={_let.in.type == DVMType.Uint64 ? 'number' : 'text'}
                    value={_let.in.valueSet || ''}
                    onChange={(value) => {
                        const newLet: Let = _let.in.type == DVMType.Uint64
                            ? {
                                ..._let,
                                in: {
                                    type: DVMType.Uint64,
                                    valueSet: value == null ? null : Number(value)
                                }
                            } : {
                                ..._let,
                                in: {
                                    type: DVMType.String,
                                    valueSet: value == null ? null : value
                                }
                            }
                        updateNodes({
                            action: NodesAction.EditNode,
                            data: {
                                id,
                                newData: {
                                    type: NodeDataKind.Let,
                                    let: newLet
                                }
                            }
                        })

                    }}
                />
            </div>


        </> : <>

            <div style={{ ...styles.row, minWidth: `${nodeWidth}px`, }}>
                {_let.in.valueSet == null ? <NodeConnector
                    id={id}
                    inout={2}
                    size={12}
                    color={_let.in.type == DVMType.String ? colors.stringType(500) : _let.in.type == DVMType.Uint64 ? colors.numericType(500) : colors.whiteAlpha(400)}
                    type={{ type: 'value', valueType: _let.in.type }}
                    way='in' /> : null}
                <span>{_let.name} {_let.in.valueSet != null ? '<-' : null} {_let.in.valueSet}</span>
            </div>
        </>
        }

    </>
}

export const VariableNode = ({ id, variable }: { id: number } & VariableNodeData) => {
    const [functions] = useAtom(functionsAtom);
    const [selectedFunction] = useAtom(selectedFunctionAtom);

    const vars = functions[unwrap(selectedFunction)].vars;
    const { nodes, updateNodes } = useGraphAtomReducer();

    const edit = nodes[id].edit;

    return <>

        <div style={styles.row}>
            {edit
                ? <SelectPicker data={Object.keys(vars).map(k => ({ label: k, value: k }))} defaultValue={variable.name} onChange={(value) => {
                    if (value != null) {
                        updateNodes({
                            action: NodesAction.EditNode,
                            data: { id, newData: { type: NodeDataKind.Variable, variable: { name: value } } }
                        })
                    }
                }} />
                : <div>{variable.name}</div>}
            <NodeConnector
                id={id}
                inout={0}
                size={12}
                color={vars[variable.name].type == DVMType.String ? colors.stringType(500) : vars[variable.name].type == DVMType.Uint64 ? colors.numericType(500) : colors.whiteAlpha(400)}
                type={{ type: 'value', valueType: vars[variable.name].type }}
                way='out' />
        </div>
    </>
}
