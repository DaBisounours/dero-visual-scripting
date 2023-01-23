import { MouseEventHandler } from "react";
import { IconButton } from "rsuite";
import { useGraphAtomReducer } from "../graph/graph";
import { colors } from "../utils/theme";
import { NodeContent } from "./NodeContent";

import EditIcon from '@rsuite/icons/Edit';
import CheckIcon from '@rsuite/icons/Check';
import CloseIcon from '@rsuite/icons/Close';
import GearIcon from '@rsuite/icons/Gear';
import { NodesAction, NodeDataKind } from "../graph/nodes";
import { selectedFunctionAtom } from "../App";
import { useAtom } from "jotai";
import { Some } from "../utils/variants";
import { match } from "ts-pattern";

type AbstractNodeProps = {
    id: number;
    selected: boolean;
    onMouseDown: MouseEventHandler<Element>,
}


export function AbstractNode({ id, selected, onMouseDown }: AbstractNodeProps) {

    const [, setSelectedFunction] = useAtom(selectedFunctionAtom);
    const { nodes, updateNodes } = useGraphAtomReducer();

    const node = nodes[id];
    const position = node.position;
    const name = node.name;

    const data = node.data;
    
    const styles: { [part: string]: React.CSSProperties } = {
        container: {
            outline: selected ? '1px solid white' : 'none',
            borderRadius: '4px',
            overflow: 'hidden',
            position: 'absolute',
            minWidth: node.edit ? '180px' : '180px',
            top: Math.floor(position.y),
            left: Math.floor(position.x),
            zIndex: 2,
        },
        header: {
            backgroundColor: colors.blackAlpha(500),
            padding: '0 2px 0 1em',
            userSelect: 'none',
            display: 'flex',
            justifyContent: 'space-between',
        },
        content: {
            backgroundColor: colors.blackAlpha(400),
            padding: '.5em',
            display: 'flex',
            width: '100%',
        },
        icon: {
            background: 'transparent',
            padding: 0,
            paddingLeft: '4px',
            margin: 0,
            outline: 'none'
        },
        name: {
            color: match(data.type)
                .with(NodeDataKind.End, _ => 'lime')
                .with(NodeDataKind.Function, _ => 'magenta')
                .with(NodeDataKind.Control, _ => 'coral')
                .with(NodeDataKind.Process, _ => 'lightskyblue')
                .with(NodeDataKind.Start, _ => 'cornsilk')
                .with(NodeDataKind.Let, _ => 'cyan')
                .with(NodeDataKind.Variable, _ => 'cyan')
                .with(NodeDataKind.Goto, _ => 'cornsilk')
                .with(NodeDataKind.Argument, _ => 'cornsilk')
                .exhaustive()
        }
    }


    const changeEdit = (c: boolean) => {
        updateNodes({
            action: NodesAction.UpdateNodeEditMode,
            data: { id, edit: c }
        })
    }
    const closeEdit: MouseEventHandler = _ => changeEdit(false);
    const openEdit: MouseEventHandler = _ => {
        if (data.type == NodeDataKind.Process) {
            setSelectedFunction(Some(data.process.name));
        } else {
            changeEdit(true);
        }

    };

    return <div
        style={styles.container}
        onMouseDown={onMouseDown}
    >
        <div style={styles.header}>
            <span style={styles.name}>{name}</span>
            <span>
                {
                    node.edit
                        ? <IconButton style={styles.icon} onClick={closeEdit} icon={<CloseIcon />} />
                        : node.data.type !== NodeDataKind.Start
                            ? <IconButton style={styles.icon} onClick={openEdit} icon={<EditIcon />} />
                            : <IconButton style={styles.icon} onClick={openEdit} icon={<GearIcon />} />


                }
            </span>
        </div>
        <div style={styles.content}>
            <div style={{ flexDirection: 'column', alignItems: "flex-start", width: "100%" }} >
                <NodeContent id={id} />
            </div>
        </div>
    </div>
}

