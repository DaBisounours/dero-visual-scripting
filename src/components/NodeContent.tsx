import { atom, useAtom } from "jotai"
import { useEffect, useState } from "react"
import { Button, Checkbox, IconButton, Input, InputGroup, Modal, SelectPicker, Stack } from "rsuite"
import { match } from "ts-pattern"
import { selectedFunctionAtom } from "../App"
import { DVM, DVMType, Uint64 } from "../dvm/types"
import { functionsAtom, useGraphAtomReducer } from "../graph/graph"
import { ConnectionData, NodeLinkTo, NodeLinkFrom, Connector, Position, NodeDataKind, EndNodeData, NodesAction, ProcessNodeData, ControlNodeData, FunctionNodeData, LetNodeData, VariableNodeData, StringConditionOperator, NumericConditionOperator, BooleanConditionOperator, Let, } from "../graph/nodes"
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
        .with({ type: NodeDataKind.Function }, ({ function: _function }) =>
            <FunctionNode id={id} function={_function} />
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
        <Separator/>
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

        <div style={styles.row}>
            <div>output</div>
            <NodeConnector
                id={id}
                inout={2}
                size={12}
                color={colors.whiteAlpha(400)}
                type={{ type: 'value', valueType: 'Variable' }}
                way='out' />
        </div>
    </>
}

export const ControlNode = ({ id, control }: { id: number } & ControlNodeData) => {
    const { nodes, updateNodes } = useGraphAtomReducer();
    const node = nodes[id];
    const edit = node.edit;

    const conditionMembers = 2;

    const types: { label: DVMType.String | DVMType.Uint64 | 'Boolean', value: DVMType.String | DVMType.Uint64 | 'Boolean' }[] = [
        { label: DVMType.String, value: DVMType.String },
        { label: DVMType.Uint64, value: DVMType.Uint64 },
        { label: 'Boolean', value: 'Boolean' },
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
        <Separator />
        {edit ? <>Type: <SelectPicker data={types} defaultValue={control.condition.type} onChange={(value) => {

            if (value != null) {
                match(value)
                    .with(DVMType.String, t => {

                        updateNodes({
                            action: NodesAction.EditNode,
                            data: {
                                id,
                                newData: {
                                    type: NodeDataKind.Control,
                                    control: {
                                        type: 'if',
                                        condition: {
                                            type: t,
                                            operator: StringConditionOperator.Equals,
                                            valueSet: { left: null, right: null },
                                        }
                                    }
                                }
                            }
                        })

                    })
                    .with(DVMType.Uint64, t => {

                        updateNodes({
                            action: NodesAction.EditNode,
                            data: {
                                id,
                                newData: {
                                    type: NodeDataKind.Control,
                                    control: {
                                        type: 'if',
                                        condition: {
                                            type: t,
                                            operator: NumericConditionOperator.Equals,
                                            valueSet: { left: null, right: null },
                                        }
                                    }
                                }
                            }
                        })

                    })
                    .with('Boolean', t => {
                        updateNodes({
                            action: NodesAction.EditNode,
                            data: {
                                id,
                                newData: {
                                    type: NodeDataKind.Control,
                                    control: {
                                        type: 'if',
                                        condition: {
                                            type: t,
                                            operator: BooleanConditionOperator.IsTrue,
                                            valueSet: { left: null, right: null },
                                        }
                                    }
                                }
                            }
                        })

                    })
                    .exhaustive();

            }

        }} /></> : null}
        {
            [...Array((control.condition.type == "Boolean" ? 2 : 3)).keys()].reverse().map(index => {
                if (index % 2 == 0) {
                    const side = index == 0 ? 'left' : 'right';
                    if (edit) {
                        return <div key={index} style={{ ...styles.row, gap: 0 }}>
                            <Checkbox checked={control.condition.valueSet[side] != null} onChange={(_, checked) => {
                                updateNodes({
                                    action: NodesAction.EditNodeArgValue,
                                    data: {
                                        id,
                                        arg: side,
                                        valueSet: checked ? control.condition.type == 'Uint64' ? 0 : 'value' : null,
                                    }
                                })
                            }} />
                            <Input
                                disabled={control.condition.valueSet[side] == null}
                                placeholder={side}
                                type={control.condition.type == 'Uint64' ? 'number' : 'text'}
                                value={control.condition.valueSet[side] || ''}
                                style={{ outline: control.condition.valueSet[side] == '' ? '2px solid red' : 'none' }}
                                onChange={(value) => {
                                    if (control.condition.valueSet[side] != null) {
                                        updateNodes({
                                            action: NodesAction.EditNodeArgValue,
                                            data: {
                                                id,
                                                arg: side,
                                                valueSet: value,
                                            }
                                        })
                                    }
                                }}
                            />
                        </div>
                    } else {

                        return <div key={index} style={styles.row}>
                            {control.condition.valueSet[side] == null ?
                                <><NodeConnector
                                    id={id}
                                    inout={1 + index}
                                    size={12}
                                    color={control.condition.type == 'String' ? colors.stringType(500) : colors.numericType(500)}
                                    type={{ type: 'value', valueType: control.condition.type == 'Boolean' ? DVMType.Uint64 : control.condition.type }}
                                    way='in' />
                                    value
                                </>
                                : <><div /> {control.condition.valueSet[side]}</>
                            }
                        </div>

                    }


                } else {
                    if (edit) {
                        return <SelectPicker data={match(control.condition.type)
                            .with(DVMType.String, _ => {
                                const operators: { [opName in StringConditionOperator]: null } = {
                                    [StringConditionOperator.Equals]: null,
                                    [StringConditionOperator.Different]: null
                                }
                                return Object.keys(operators).map((operator) => ({ label: operator, value: operator }))
                            })
                            .with(DVMType.Uint64, _ => {
                                const operators: { [opName in NumericConditionOperator]: null } = {
                                    [NumericConditionOperator.Equals]: null,
                                    [NumericConditionOperator.Greater]: null,
                                    [NumericConditionOperator.GreaterOrEquals]: null,
                                    [NumericConditionOperator.Lower]: null,
                                    [NumericConditionOperator.LowerOrEquals]: null
                                }
                                return Object.keys(operators).map((operator) => ({ label: operator, value: operator }))
                            })
                            .with('Boolean', _ => {
                                const operators: { [opName in BooleanConditionOperator]: null } = {
                                    [BooleanConditionOperator.IsTrue]: null,
                                    [BooleanConditionOperator.IsNotTrue]: null
                                }
                                return Object.keys(operators).map((operator) => ({ label: operator, value: operator }))
                            })
                            .exhaustive()} defaultValue={control.condition.operator} onChange={(value) => {
                                if (value != null) {

                                    updateNodes({
                                        action: NodesAction.EditNode,
                                        data: {
                                            id,
                                            newData: {
                                                type: NodeDataKind.Control,
                                                control: {
                                                    type: 'if',
                                                    condition: {
                                                        ...control.condition,
                                                        // @ts-ignore
                                                        operator: value,
                                                    }
                                                }
                                            }
                                        }
                                    })


                                }
                            }}
                            style={{ width: '100%' }} />
                    } else {

                        return <div key={index} style={styles.row}><div></div>{control.condition.operator}</div>
                    }


                }
            }

            ).reverse()
        }
        <Separator />
        {
            ['then', 'else'].map((outName, index) =>
                <div key={outName} style={styles.row}>
                    {outName}
                    <NodeConnector
                        id={id}
                        inout={1 + conditionMembers + index}
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

                    const valueType = arg.type;

                    return <div key={index} style={styles.row}>
                        {arg.valueSet == null ?
                            <NodeConnector
                                id={id}
                                inout={asProcess ? 2 + index : index}
                                size={12}
                                color={valueType == 'String' ? colors.stringType(500) : valueType == 'Uint64' ? colors.numericType(500) : colors.whiteAlpha(500)}
                                type={{ type: 'value', valueType: valueType }}
                                way='in' /> : <div>{arg.valueSet}</div>}
                        {arg_key}
                    </div>

                }

            })
            : arg_names.map((arg_key: string, index) => {
                // @ts-ignore
                const arg = args[arg_key];

                const valueType = arg.type;

                return <div key={index} style={{ ...styles.row, gap: 0 }}>
                    <Checkbox checked={arg.valueSet != null} onChange={(_, checked) => {
                        updateNodes({
                            action: NodesAction.EditNodeArgValue,
                            data: {
                                id,
                                arg: arg_key,
                                valueSet: checked ? 'value' : null,
                            }
                        })
                    }} />
                    <Input
                        disabled={arg.valueSet == null}
                        placeholder={arg_key}
                        type={valueType == 'Uint64' ? 'number' : 'text'}
                        value={arg.valueSet == null ? '' : arg.valueSet}
                        style={{ outline: arg.valueSet == '' ? '2px solid red' : 'none' }}
                        onChange={(value) => {
                            if (arg.valueSet != null) {
                                updateNodes({
                                    action: NodesAction.EditNodeArgValue,
                                    data: {
                                        id,
                                        arg: arg_key,
                                        valueSet: value,
                                    }
                                })
                            }
                        }}
                    />
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



export const LetNode = ({ id, let: _let }: { id: number } & LetNodeData) => {
    const { nodes, updateNodes } = useGraphAtomReducer();
    const node = nodes[id];
    const edit = node.edit;
    const nodeWidth = 128;

    const [functions, setFunctions] = useAtom(functionsAtom);
    const [selectedFunction] = useAtom(selectedFunctionAtom);
    const vars = functions[unwrap(selectedFunction)].vars;
    const declaredVariables: { label: string, value: string, type: DVMType }[] = Object.entries(vars).map(([k, v]) => ({ label: k, value: k, type: v.type })); // TODO add declared variables

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
        <Separator/>
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

/*
export const DimNode = ({ id, dim }: { id: number } & DimNodeData) => {
    const { nodes, updateNodes, links } = useGraphAtomReducer();
    const node = nodes[id];
    const edit = node.edit;
    const nodeWidth = 128;
    const returnTypes: { label: DVMType, value: DVMType }[] = [
        { label: DVMType.String, value: DVMType.String },
        { label: DVMType.Uint64, value: DVMType.Uint64 },
    ]
    return <>
        {edit ? <>
            <div style={{ ...styles.row, minWidth: `${nodeWidth}px`, }}>
                <Input
                    placeholder={'Variable Name'}
                    type={'text'}
                    value={dim.name || ''}
                    style={{ outline: dim.name == '' ? '2px solid red' : 'none' }}
                    onChange={(value) => {
                        if (dim.name != null && value != '') {
                            updateNodes({
                                action: NodesAction.EditNode,
                                data: {
                                    id,
                                    newData: {
                                        type: NodeDataKind.Dim,
                                        dim: {
                                            ...dim,
                                            name: value
                                        }

                                    }
                                }
                            })
                        }
                    }}
                />
            </div>
            <div style={{ ...styles.row, minWidth: `${nodeWidth}px`, }}>
                <SelectPicker data={returnTypes} defaultValue={dim.type} style={{ width: '100%' }}
                    onChange={(value) => {
                        if (value != null) {
                            updateNodes({
                                action: NodesAction.EditNode,
                                data: {
                                    id,
                                    newData: {
                                        type: NodeDataKind.Dim,
                                        dim: {
                                            ...dim,
                                            type: value,
                                        }

                                    }
                                }
                            })
                        }
                    }} />
            </div>

        </> :
            <div style={{ ...styles.row, minWidth: `${nodeWidth}px`, }}> {dim.name} </div>
        }

    </>
}
*/

// TODO create DIM / LET and VARIABLE nodes
/*export const DimLetNode = ({ id, dimlet }: { id: number } & DimLetNodeData) => {
    const { nodes, updateNodes, links } = useGraphAtomReducer();
    const node = nodes[id];
    const edit = node.edit;
    const nodeWidth = 128;
    const valueType = dimlet.return.type;
    const arg = dimlet.args.in;
    // TODO EDIT MODE Type
    const outputs = links.filter(link => link.from.id == id || link.to.id == id);
    const returnTypes: { label: DVMType, value: DVMType }[] = [
        { label: DVMType.String, value: DVMType.String },
        { label: DVMType.Uint64, value: DVMType.Uint64 },
    ]

    return <>

        {edit ? <>
            <div style={{ ...styles.row, minWidth: `${nodeWidth}px`, }}>
                <SelectPicker data={returnTypes} defaultValue={dimlet.return.type} style={{ width: '100%' }}
                    onChange={(value) => {
                        match(value)
                            .with(DVMType.String, returnType => {
                                updateNodes({
                                    action: NodesAction.EditNode,
                                    data: {
                                        id,
                                        newData: {
                                            type: NodeDataKind.DimLet,
                                            dimlet: {
                                                args: { in: { valueSet: null, type: returnType } },
                                                return: { valueSet: null, type: returnType },
                                                name: dimlet.name
                                            }

                                        }
                                    }
                                })
                            })
                            .with(DVMType.Uint64, returnType => {
                                updateNodes({
                                    action: NodesAction.EditNode,
                                    data: {
                                        id,
                                        newData: {
                                            type: NodeDataKind.DimLet,
                                            dimlet: {
                                                args: { in: { valueSet: null, type: returnType } },
                                                return: { valueSet: null, type: returnType },
                                                name: dimlet.name
                                            }
                                        }
                                    }
                                })
                            })
                            .otherwise(_ => { })
                    }} />
            </div>
            <div style={{ ...styles.row, minWidth: `${nodeWidth}px`, }}>
                <Input
                    placeholder={'Variable Name'}
                    type={'text'}
                    value={dimlet.name || ''}
                    style={{ outline: dimlet.name == '' ? '2px solid red' : 'none' }}
                    onChange={(value) => {
                        if (dimlet.name != null) {
                            updateNodes({
                                action: NodesAction.EditNode,
                                data: {
                                    id,
                                    newData: {
                                        type: NodeDataKind.DimLet,
                                        dimlet: {
                                            ...dimlet,
                                            name: value
                                        }

                                    }
                                }
                            })
                        }
                    }}
                />
            </div>
        </> : <div style={{ ...styles.row, minWidth: `${nodeWidth}px`, }}> {dimlet.name} </div>}

        <Separator />
        {!edit
            ? <div style={styles.row}>
                {arg.valueSet == null ?
                    <NodeConnector
                        id={id}
                        inout={0}
                        size={12}
                        color={valueType == DVMType.String ? colors.stringType(500) : valueType == DVMType.Uint64 ? colors.numericType(500) : colors.whiteAlpha(500)}
                        type={{ type: 'value', valueType: valueType }}
                        way='in' /> : <div>{arg.valueSet}</div>}
                value
            </div>

            : <div style={{ ...styles.row, gap: 0 }}>
                <Checkbox checked={arg.valueSet != null} onChange={(_, checked) => {
                    updateNodes({
                        action: NodesAction.EditNodeArgValue,
                        data: {
                            id,
                            arg: 'in',
                            valueSet: checked ? 'value' : null,
                        }
                    })
                }} />
                <Input
                    disabled={arg.valueSet == null}
                    placeholder={'in'}
                    type={valueType == DVMType.Uint64 ? 'number' : 'text'}
                    value={arg.valueSet == null ? '' : arg.valueSet}
                    style={{ outline: arg.valueSet == '' ? '2px solid red' : 'none' }}
                    onChange={(value) => {
                        if (arg.valueSet != null) {
                            updateNodes({
                                action: NodesAction.EditNodeArgValue,
                                data: {
                                    id,
                                    arg: 'in',
                                    valueSet: value,
                                }
                            })
                        }
                    }}
                />
            </div>

        }
        <Separator />
        {
            outputs.map((_, index) => <div key={index} style={styles.row}>
                output
                <NodeConnector
                    id={id}
                    inout={1 + index}
                    size={12}
                    color={valueType == DVMType.String ? colors.stringType(500) : valueType == DVMType.Uint64 ? colors.numericType(500) : colors.whiteAlpha(400)}
                    type={{ type: 'value', valueType: dimlet.return.type }}
                    way='out' />
            </div>)


        }

    </>
}*/
