import { MouseEventHandler, useEffect, useState } from "react";
import { Cascader, Container } from "rsuite";
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
import { Node, NodeLink, NodesAction, NodeOffset, Offset, Position, NodeDataKind, NumericConditionOperator, StringConditionOperator } from "../graph/nodes";
import { selectedFunctionAtom } from "../App";
import { defaultDimLet, defaultDVMFunctionMap, DVM, DVMFunction, DVMType } from "../dvm/types";





// CANVAS
type CanvasProps = {
    style: any,
    toolbar?: any
    gridCellSizePx: number,
}

export function Canvas({ style, gridCellSizePx, toolbar }: CanvasProps) {
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

    const onNodeMouseDown = (id: number) => {
        const handler: MouseEventHandler = (event) => {
            event.stopPropagation();
            setSelectedElement(Some({ type: 'node', id }))
            const offset = {
                x: event.pageX - nodes[id].position.x,
                y: event.pageY - nodes[id].position.y,
            }
            setMovingNode(Some({ id, offset }));
        }
        return handler;
    }

    const onCanvasMouseDown: MouseEventHandler = (event) => {
        setSelectedElement(None());
        setMovingCanvas(Some({
            start: { x: event.clientX, y: event.clientY },
            move: { x: 0, y: 0 },
        }));
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
    const processes = hasSome(selectedFunction) ? Object.keys(functions).filter(name => functions[name].isProcess && name != unwrap(selectedFunction)) : []

    const addNodeData = [
        {
            label: NodeDataKind.Argument,
            value: '-1',
            children: [
                { label: 'Argument', value: 'argument' },
            ], disabled: true
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
            label: NodeDataKind.DimLet,
            value: '2',
            children: [
                { label: 'Dim-Let', value: 'dim-let' }
            ]
        },
        {
            label: NodeDataKind.Control,
            value: '3',
            children: [
                { label: 'Condition', value: 'if' },
                { label: 'GOTO', value: 'goto' },
            ]
        },
        {
            label: NodeDataKind.Function,
            value: '4',
            children: [
                ...Object.values(DVM).map(value => ({ label: value, value: JSON.stringify({ dvm: value }) }))
            ]
        },

    ];


    const onCascaderValueSelected:
        ((value: string | null, event: React.SyntheticEvent<Element, Event>) => void) =
        (value) => {
            const defaultPosition = {
                x: 200,
                y: 200
            }
            const node: Node | void = match(value)
                .with('return', () => {
                    const n: Node = {
                        name: "End",
                        edit: false,
                        locked: false,
                        position: defaultPosition,
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
                        position: defaultPosition,
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
                        position: defaultPosition,
                        data: {
                            type: NodeDataKind.End,
                            end: { type: 'panic' }
                        }
                    }
                    return n;
                })
                .with('dim-let', () => {
                    const n: Node = {
                        name: "Dim - Let",
                        edit: false,
                        locked: false,
                        position: defaultPosition,
                        data: {
                            type: NodeDataKind.DimLet,
                            dimlet: defaultDimLet,
                        }
                    }
                    return n;
                })
                .with('if', () => {
                    const n: Node = {
                        name: "Condition",
                        edit: false,
                        locked: false,
                        position: defaultPosition,
                        data: {
                            type: NodeDataKind.Control,
                            control: {
                                type: 'if',
                                condition: {
                                    type: DVMType.String,
                                    operator: StringConditionOperator.Equals,
                                    valueSet: {
                                        left: null, right: null
                                    }
                                }
                            }
                        }
                    }
                    return n;
                })
                .with('goto', () => {
                    const n: Node = {
                        name: "GOTO",
                        edit: false,
                        locked: false,
                        position: defaultPosition,
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
                            position: defaultPosition,
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
                                position: defaultPosition,
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
            if (node) {
                updateNodes({
                    action: NodesAction.AddNode,
                    data: node,
                })
            } else {

            }



        }

    return <>
        <div style={{ display: 'flex', alignItems: 'center', userSelect: 'none', gap: '2em' }}>
            {toolbar}
            {hasSome(selectedFunction) ? unwrap(selectedFunction) : null}
            <Cascader
                placeholder='Add node'
                defaultValue={null}
                disabledItemValues={['none', ...(Object.keys(functions[unwrap(selectedFunction)].args).length > 0 ? [] : ['-1'])]}
                data={addNodeData}
                menuWidth={400}
                menuHeight={400}
                value={null}
                onChange={onCascaderValueSelected} />
        </div>
        <Container className="canvas" style={{ ...style, overflow: "hidden", userSelect: 'none' }} ref={(el) => {
            if (!el) return;
            const rect = el.getBoundingClientRect()
            if (containerPosition.x != rect.x || containerPosition.y != rect.y) {
                setContainerPosition({ x: rect.x, y: rect.y });
            }
        }}>

            <div
                style={{ position: 'relative', width: "100%", height: '100%' }}
                onMouseDown={onCanvasMouseDown}
                onMouseUp={onMouseUp}
                onMouseMove={onMouseMove}

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
