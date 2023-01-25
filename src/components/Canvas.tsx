import { MouseEventHandler, useEffect, useState } from "react";
import { Cascader, Container, IconButton } from "rsuite";
import { colors } from "../utils/theme";
import { hasSome, None, Option, Some, unwrap } from "../utils/variants";
import { AbstractNode } from "./Node";
import { nodesConnectorPositionAtom, nodesConnectorPositionReducer } from "./NodeContent";
import { useAtom } from 'jotai';
import { useReducerAtom } from 'jotai/utils';
import { match } from "ts-pattern";
import { connectorLinkingAtom } from "./Connector";
import { useKeyPress } from "../utils/misc";
import { useGraphAtomReducer, functionsAtom } from "../graph/graph";
import { LinksAction, linkEquals } from "../graph/links";
import { Node, NodeLink, NodesAction, NodeOffset, Offset, Position, NodeDataKind, StringComparator, Uint64Operator } from "../graph/nodes";
import { selectedFunctionAtom } from "../App";
import { defaultDVMFunctionMap, DVM, DVMType } from "../dvm/types";
import CheckOutlineIcon from '@rsuite/icons/CheckOutline';
import CloseOutlineIcon from '@rsuite/icons/CloseOutline';

import MenuIcon from '@rsuite/icons/Menu';




// CANVAS
type CanvasProps = {
    style: any,
    setCodeDrawerOpen: any,
    setMenuDrawerOpen: any,
    validGraph: boolean,
    gridCellSizePx: number,
}

export function Canvas({ style, gridCellSizePx, validGraph, setMenuDrawerOpen, setCodeDrawerOpen }: CanvasProps) {
    const [functions] = useAtom(functionsAtom);

    const { nodes, updateNodes, links, updateLinks } = useGraphAtomReducer();

    const [selectedElement, setSelectedElement] = useState<Option<{ type: 'node', id: number } | { type: 'link', link: NodeLink }>>(None());

    useEffect(() => {
        if (hasSome(selectedElement)) {
            console.log('selected', unwrap(selectedElement));
        }

    }, [selectedElement])


    useKeyPress((event: KeyboardEvent) => {
        if (hasSome(selectedElement)) {
            const element = unwrap(selectedElement)

            if (event.code === 'Delete') {
                if (element.type == 'node') {
                    updateNodes({ action: NodesAction.DeleteNode, data: { id: element.id } })
                    updateLinks({ action: LinksAction.RemoveRelated, data: { nodeId: element.id } })
                } else {
                    updateLinks({ action: LinksAction.Remove, data: element.link })
                }
            }
        }
    }, [selectedElement])


    const [connectorLinking, setConnectorLinking] = useAtom(connectorLinkingAtom);

    const [movingNode, setMovingNode] = useState<Option<NodeOffset>>(None());

    const [canvasPosition, setCanvasPosition] = useState<Offset>({ x: 0, y: 0 })
    const [movingCanvas, setMovingCanvas] = useState<Option<{ start: Offset, move: Offset }>>(None());

    const [contextMenuOpen, setContextMenuOpen] = useState<Option<Offset>>(None());


    const onNodeMouseDown = (id: number) => {
        const handler: MouseEventHandler = (event) => {
            switch (event.button) {
                case MouseButton.Right:
                    event.stopPropagation();
                    return;
                case MouseButton.Middle:
                    event.stopPropagation();
                    return;
                default:
                    event.stopPropagation();
                    setSelectedElement(Some({ type: 'node', id }))
                    const offset = {
                        x: event.pageX - nodes[id].position.x,
                        y: event.pageY - nodes[id].position.y,
                    }
                    setMovingNode(Some({ id, offset }));
            }

        }
        return handler;
    }

    enum MouseButton { Left = 0, Middle = 1, Right = 2 };

    const onCanvasMouseDown: MouseEventHandler = (event) => {
        if (event.button == MouseButton.Left) {
            setContextMenuOpen(None());
            setSelectedElement(None());
            setMovingCanvas(Some({
                start: { x: event.clientX, y: event.clientY },
                move: { x: 0, y: 0 },
            }));

        }

    }

    const onMouseUp: MouseEventHandler = _ => {

        if (hasSome(connectorLinking)) {
            setConnectorLinking(None());
        }
        if (hasSome(movingNode)) {
            setMovingNode(None());
        }
        if (hasSome(movingCanvas)) {
            const move = unwrap(movingCanvas).move;
            setCanvasPosition({ x: canvasPosition.x + move.x, y: canvasPosition.y + move.y });
            setMovingCanvas(None());
        }

    }

    const [mousePosition, setMousePosition] = useState<Position>({ x: 0, y: 0 });

    const onMouseMove: MouseEventHandler = event => {
        setMousePosition({ x: event.clientX, y: event.clientY });

        if (hasSome(movingNode)) {
            const node = unwrap(movingNode);

            let x = event.pageX - node.offset.x;
            let y = event.pageY - node.offset.y;

            x = x - (x % gridCellSizePx);
            y = y - (y % gridCellSizePx);

            if (nodes[node.id].position.x != x
                || nodes[node.id].position.y != y) {

                updateNodes({
                    action: NodesAction.UpdateNodePosition,
                    data: { id: node.id, position: { x, y } }
                })
            }

        }
        if (hasSome(movingCanvas)) {
            const moving = unwrap(movingCanvas);
            let x = event.clientX - moving.start.x;
            let y = event.clientY - moving.start.y;

            setMovingCanvas(Some({ start: moving.start, move: { x, y } }))
        }
    }

    const [nodesConnectorPosition] = useReducerAtom(nodesConnectorPositionAtom, nodesConnectorPositionReducer);


    const [containerPosition, setContainerPosition] = useState<Position>({ x: 0, y: 0 });

    const [selectedFunction] = useAtom(selectedFunctionAtom);
    const processes = hasSome(selectedFunction) ? Object.keys(functions).filter(name => /*functions[name].isProcess &&*/ name != unwrap(selectedFunction)) : []

    const addNodeData = [
        {
            label: NodeDataKind.Argument,
            value: '-1',
            children: [
                { label: 'Argument', value: 'argument' },
            ]
        },
        {
            label: NodeDataKind.Process,
            value: '0',
            children: processes.length > 0 ? processes.map((name) => (
                { label: <i>{name}</i>, value: JSON.stringify({ process: name }) }
            )) : [{ label: <i>no process</i>, value: 'none' }]

        },
        {
            label: NodeDataKind.End,
            value: '1',
            children: [
                { label: 'Return', value: 'return' },
                { label: 'Panic', value: 'panic' }
            ]
        },
        {
            label: 'variable',
            value: '2',
            children: [
                { label: 'Let (assign)', value: 'let' },
                { label: 'Variable (use)', value: 'variable' },
            ]
        },
        {
            label: NodeDataKind.Control,
            value: '3',
            children: [
                { label: 'If', value: 'if' },
                { label: 'Condition', value: 'condition' },
                { label: 'Goto', value: 'goto' },
            ]
        },
        {
            label: NodeDataKind.Operation,
            value: 'operation',
        },
        {
            label: NodeDataKind.Function,
            value: '5',
            children: [
                ...Object.values(DVM).map(value => ({ label: value, value: JSON.stringify({ dvm: value }) }))
            ]
        },

    ];


    const onCascaderValueSelected:
        ((value: string | null, event: React.SyntheticEvent<Element, Event>) => void) =
        (value) => {
            const position = match(contextMenuOpen)
                .with({ type: 'Some' }, somePosition => {
                    return unwrap(somePosition)
                })
                .otherwise(_ => ({ x: 200, y: 200 }))


            const node: Node | void = match(value)
                .with('return', () => {
                    const n: Node = {
                        name: "End",
                        edit: false,
                        locked: false,
                        position,
                        data: {
                            type: NodeDataKind.End,
                            end: { type: 'return', returnType: DVMType.Uint64, value: 0 }
                        }
                    }
                    return n;
                })
                .with('argument', () => {
                    const n: Node = {
                        name: "Argument",
                        edit: false,
                        locked: false,
                        position,
                        data: {
                            type: NodeDataKind.Argument,
                            name: Object.keys(functions[unwrap(selectedFunction)].args)[0]
                        }
                    }
                    return n;
                })
                .with('panic', () => {
                    const n: Node = {
                        name: "End",
                        edit: false,
                        locked: false,
                        position,
                        data: {
                            type: NodeDataKind.End,
                            end: { type: 'panic' }
                        }
                    }
                    return n;
                })
                .with('let', () => {
                    const vars = functions[unwrap(selectedFunction)].vars
                    const _var = Object.keys(vars)[0];
                    const type = vars[_var].type
                    console.warn(_var);
                    
                    if (type != DVMType.Variable) {
                        const n: Node = {
                            name: "Let",
                            edit: false,
                            locked: false,
                            position,
                            data: {
                                type: NodeDataKind.Let,
                                // @ts-ignore //! messy
                                let: { name: _var, in: { type, value: null } },
                            }
                        }
                        return n;
                    }

                })
                .with('variable', () => {
                    const vars = functions[unwrap(selectedFunction)].vars
                    const _var = Object.keys(vars)[0];
                    const n: Node = {
                        name: "Variable",
                        edit: false,
                        locked: false,
                        position,
                        data: {
                            type: NodeDataKind.Variable,
                            variable: { name: _var },
                        }
                    }
                    return n;
                })
                .with('if', () => {
                    const n: Node = {
                        name: "If",
                        edit: false,
                        locked: false,
                        position,
                        data: {
                            type: NodeDataKind.Control,
                            control: {
                                type: 'if',
                            }
                        }
                    }
                    return n;
                })
                .with('condition', () => {
                    const n: Node = {
                        name: 'Condition',
                        edit: false,
                        locked: false,
                        position,
                        data: {
                            type: NodeDataKind.Condition,
                            condition: {
                                type: DVMType.String,
                                operator: StringComparator.Equals,
                                valueSet: {
                                    left: null, right: null
                                }
                            }
                        }
                    }
                    return n;
                })
                .with('operation', () => {
                    const n: Node = {
                        name: "Operation",
                        edit: false,
                        locked: false,
                        position,
                        data: {
                            type: NodeDataKind.Operation,
                            operation: { 
                                type: DVMType.Uint64, 
                                operator: Uint64Operator.Add,
                                valueSet: { left: null, right: null }
                            },
                            
                            
                        }
                    }
                    return n;
                })
                .with('goto', () => {
                    const n: Node = {
                        name: "GOTO",
                        edit: false,
                        locked: false,
                        position,
                        data: {
                            type: NodeDataKind.Goto,
                        }
                    }
                    return n;
                })
                .when(v => 'process' in JSON.parse(v || 'null'), v => {
                    const p: { process: string } = JSON.parse(v || 'null');
                    if (p) {

                        const n: Node = {
                            name: "Process",
                            edit: false,
                            locked: false,
                            position,
                            data: {
                                type: NodeDataKind.Process,
                                process: { name: p.process }
                            }
                        }
                        return n;
                    }
                    throw 'malformed value ' + v
                })
                .when(v => 'dvm' in JSON.parse(v || 'null'), v => {
                    const f: { dvm: DVM } = JSON.parse(v || 'null');
                    if (f) {
                        console.warn(f);

                        const name = f.dvm;
                        if (name in DVM) {
                            const n: Node = {
                                name: 'DVM Function',
                                edit: false,
                                locked: false,
                                position,
                                data: {
                                    type: NodeDataKind.Function,
                                    function: defaultDVMFunctionMap[name],
                                }
                            }
                            return n;
                        }

                    }
                })
                .otherwise(v => { console.error('Not implemented ' + v); });
            setContextMenuOpen(None());
            if (node) {
                updateNodes({
                    action: NodesAction.AddNode,
                    data: node,
                })
            } else {

            }



        }

    const addNodeCascader = (defaultOpen: boolean) => <div className="CASCADER">
        <Cascader
            placeholder='Add node'
            defaultValue={null}
            defaultOpen={defaultOpen}
            disabledItemValues={[
                'none', 
                ...(Object.keys(functions[unwrap(selectedFunction)].args).length > 0 ? [] : ['-1']), 
                ...(Object.keys(functions[unwrap(selectedFunction)].vars).length > 0 ? [] : ['2']), 
            ]}
            data={addNodeData}

            menuWidth={200}
            menuHeight={256}
            style={{ zIndex: 10 }}
            value={null}
            onChange={onCascaderValueSelected} />
    </div>


    return <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '2em' }}>
            <div style={{ display: 'flex', alignItems: 'center', userSelect: 'none', gap: '2em' }}>
                <IconButton onClick={() => { setMenuDrawerOpen(true) }} style={{ margin: '1em' }} icon={<MenuIcon />} />

                {hasSome(selectedFunction) ? unwrap(selectedFunction) : null}
                {addNodeCascader(false)}
            </div>
            <div><IconButton onClick={() => { setCodeDrawerOpen(true) }} icon={validGraph ? <CheckOutlineIcon /> : <CloseOutlineIcon />} /></div>

        </div>
        <Container className="canvas" style={{ ...style, overflow: "hidden", userSelect: 'none' }} ref={(el) => {
            if (!el) return;
            const rect = el.getBoundingClientRect()
            if (containerPosition.x != rect.x || containerPosition.y != rect.y) {
                setContainerPosition({ x: rect.x, y: rect.y });
            }
        }}>
            {hasSome(contextMenuOpen) ? <div style={{ position: 'absolute', left: unwrap(contextMenuOpen).x - 24, top: unwrap(contextMenuOpen).y - 24 }}>
                {addNodeCascader(true)}
            </div> : <></>}
            <div
                style={{ position: 'relative', width: "100%", height: '100%' }}
                onMouseDown={onCanvasMouseDown}
                onMouseUp={onMouseUp}
                onMouseMove={onMouseMove}
                onDoubleClick={e => setContextMenuOpen(Some({ x: e.clientX, y: e.clientY }))}
            >


                <div
                    className="nodes"
                    style={{
                        position: 'absolute',
                        left: canvasPosition.x + (hasSome(movingCanvas) ? unwrap(movingCanvas).move.x : 0) + 'px',
                        top: canvasPosition.y + (hasSome(movingCanvas) ? unwrap(movingCanvas).move.y : 0) + 'px',
                        height: '100%',

                    }}
                >
                    {// Nodes
                        Object.keys(nodes)
                            .map((key) => {
                                const id = Number(key);

                                return <AbstractNode
                                    key={key}
                                    onMouseDown={onNodeMouseDown(id)}
                                    id={id}
                                    selected={selectedElement.type == 'Some' && selectedElement.value.type == 'node' && selectedElement.value.id == id}
                                />
                            }
                            )
                    }

                </div>

                <svg style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'auto',
                }}>
                    <g transform={`translate(${-containerPosition.x}, ${-containerPosition.y})`}>
                        <>
                            {// Nodes 
                                Object.entries(links)
                                    .map(([key, { from, to, type }]) => {


                                        if (from.id in nodesConnectorPosition
                                            && from.output in nodesConnectorPosition[from.id].outputs
                                            && to.id in nodesConnectorPosition
                                            && to.input in nodesConnectorPosition[to.id].inputs
                                        ) {
                                            const positionFrom = nodesConnectorPosition[from.id].outputs[from.output].position;
                                            const positionTo = nodesConnectorPosition[to.id].inputs[to.input].position;
                                            const colorStrength = selectedElement.type == 'Some'
                                                && selectedElement.value.type == 'link'
                                                && linkEquals({ from, to, type }, selectedElement.value.link) ? 800 : 500;
                                            const color = type.type == 'flow' || (type.type == 'value' && type.valueType == 'Variable') ? colors.whiteAlpha(colorStrength) : type.valueType == 'String' ? colors.stringType(colorStrength) : colors.numericType(colorStrength)

                                            return <line
                                                key={key}
                                                x1={positionFrom.x}
                                                y1={positionFrom.y}
                                                x2={positionTo.x}
                                                y2={positionTo.y}
                                                stroke={color}
                                                strokeWidth={6}
                                                strokeLinecap="round"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setSelectedElement(Some({ type: 'link', link: { from, to, type } }))
                                                }}

                                            />
                                        }
                                    })
                            }
                            {
                                match(connectorLinking)
                                    .with({ type: 'Some' }, cl => {

                                        const connector = unwrap(cl);
                                        if (connector.id in nodesConnectorPosition
                                            && connector.inout in (connector.way == 'out' ? nodesConnectorPosition[connector.id].outputs : nodesConnectorPosition[connector.id].inputs)) {


                                            const positionFrom =
                                                connector.way == 'out'
                                                    ? nodesConnectorPosition[connector.id].outputs[connector.inout].position
                                                    : nodesConnectorPosition[connector.id].inputs[connector.inout].position
                                                ;
                                            return <line
                                                stroke={colors.whiteAlpha(500)}
                                                strokeWidth={6}
                                                x1={positionFrom.x}
                                                y1={positionFrom.y}
                                                x2={mousePosition.x}
                                                y2={mousePosition.y}
                                                strokeLinecap="round"
                                            />

                                        }

                                    }).otherwise(_ => { })
                            }
                        </>
                    </g>
                </svg>

            </div>

        </Container>
    </>
}
