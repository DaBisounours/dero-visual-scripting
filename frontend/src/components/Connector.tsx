import { atom, useAtom } from "jotai";
import { useReducerAtom } from "jotai/utils";
import { MouseEventHandler, useState } from "react";
import { match } from "ts-pattern";
import { useGraphAtomReducer } from "../graph/graph";
import { LinksAction } from "../graph/links";
import { Connector, Position, NodeLink } from "../graph/nodes";
import { Option, None, Some, unwrap, hasSome } from "../utils/variants";
import { nodesConnectorPositionAtom, nodesConnectorPositionReducer } from "./NodeContent";



export const connectorLinkingAtom = atom<Option<{ id: number, inout: number, type: Connector, way: 'in' | 'out' }>>(None<any>());
export type NodeConnectorProps = { id: number, inout: number, size: number, color: string, way: 'in' | 'out', type: Connector }
export const NodeConnector = ({ id, inout, size, color, way, type }: NodeConnectorProps) => {
    const [connectorLinking, setConnectorLinking] = useAtom(connectorLinkingAtom);
    const { updateLinks } = useGraphAtomReducer();


    const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
    const [, setNodesConnectorPosition] = useReducerAtom(nodesConnectorPositionAtom, nodesConnectorPositionReducer);

    const onMouseDown: MouseEventHandler = (event) => {
        event.stopPropagation();
        setConnectorLinking(Some({ id, inout, type, way }));
    }
    const onMouseUp: MouseEventHandler = (event) => {
        event.stopPropagation();

        function typeEquals(t1: Connector, t2: Connector, incomingWay: 'in' | 'out') {
            if (t1.type == t2.type) {
                if (t1.type == 'value' && t2.type == 'value') {
                    if (t1.valueType == t2.valueType
                        || t1.valueType == 'Variable' || t2.valueType == 'Variable') {
                        return true;
                    }
                } else {
                    return true;
                }
            }
            return false;
        }

        if (hasSome(connectorLinking)) {
            const incoming = unwrap(connectorLinking);


            if (incoming.id != id) {
                if (typeEquals(incoming.type, type, incoming.way)) {
                    if (incoming.way != way) {
                        updateLinks({
                            action: LinksAction.Add,
                            data: match(incoming.way).with('out', (_): NodeLink => ({
                                from: {
                                    id: incoming.id, output: incoming.inout,
                                },
                                to: {
                                    id, input: inout
                                },
                                type
                            })).with('in', (_): NodeLink => ({
                                from: {
                                    id, output: inout
                                },
                                to: {
                                    id: incoming.id, input: incoming.inout,
                                },
                                type
                            })).exhaustive(),
                        })
                    }
                }
            }
        }

        setConnectorLinking(None());
    }

    const [isHovered, setIsHovered] = useState(false);

    const style = match(type)
        .with({ type: 'value' }, _ => ({
            width: size,
            height: size,
            borderRadius: size,
            backgroundColor: isHovered ? 'white' : color,
        }))
        .with({ type: 'flow' }, _ => ({
            width: 0,
            height: 0,
            margin: `0 ${size / 4}px`,
            borderTop: `${size / 2}px solid transparent`,
            borderLeft: `${2 * size / 3}px solid ${isHovered ? 'white' : color}`,
            borderBottom: `${size / 2}px solid transparent`,
        }))
        .exhaustive();

    return <div
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseEnter={_ => setIsHovered(true)}
        onMouseLeave={_ => setIsHovered(false)}
        style={style}
        ref={el => {
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }

            if (center.x != position.x || center.y != position.y) {
                setPosition(center);
                if (way == 'in') {
                    setNodesConnectorPosition({ action: 'in', in: { id, input: inout }, def: type, position: center })
                } else {
                    setNodesConnectorPosition({ action: 'out', out: { id, output: inout }, def: type, position: center })
                }
            }
        }}
    ></div>
}
