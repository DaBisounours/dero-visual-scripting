import { WritableDraft } from "immer/dist/internal";
import { match } from "ts-pattern";
import { DVMFunction, DVMType, StringType, Uint64, Uint64Type, Variable, VariableType } from "../dvm/types";
import { Nodes } from "./graph";

export type Node = {
    name: string;
    edit: boolean;
    locked: boolean,
    position: Position,
    data: NodeData,
}

export type Offset = { x: number, y: number }
export type Position = Offset
export type NodeOffset = { id: number, offset: Offset }
export type NodePosition = { id: number, position: Position }



export enum NodeDataKind {
    Start = 'start',
    Argument = 'argument',
    Function = 'function',
    Operation = 'operation',
    Condition = 'condition',
    Process = 'process', // TODO rename to Procedure or Subroutine
    Let = 'let',
    Variable = 'variable',
    Goto = 'goto',
    End = 'end',
    Control = 'control',
}

export type NodeData =
    | { type: NodeDataKind.Start }
    | { type: NodeDataKind.Goto }
    | { type: NodeDataKind.End } & EndNodeData
    | { type: NodeDataKind.Control } & ControlNodeData
    | { type: NodeDataKind.Function } & FunctionNodeData
    | { type: NodeDataKind.Operation } & OperationNodeData
    | { type: NodeDataKind.Condition } & ConditionNodeData
    | { type: NodeDataKind.Let } & LetNodeData
    | { type: NodeDataKind.Variable } & VariableNodeData
    | { type: NodeDataKind.Process } & ProcessNodeData
    | { type: NodeDataKind.Argument } & ArgumentNodeData

export type ArgumentNodeData = {
    name: string
}

export type EndNodeData = {
    end:
    | { type: 'panic' }
    | { type: 'return', value: Uint64, returnType: DVMType.Uint64 }
    | { type: 'return', value: string | null, returnType: DVMType.String }
}


export type ControlNodeData = {
    control:
    | { type: 'if' }
}


export enum Uint64Comparator {
    Equals = '==',
    Greater = '>',
    GreaterOrEquals = '>=',
    Lower = '<',
    LowerOrEquals = '<=',
    Differs = '!=',
}

export const isUint64Comparator = (v: string): v is Uint64Comparator => Object.values<string>(Uint64Comparator).includes(v);

export enum StringComparator {
    Equals = '==',
    Different = '!=',
}

export const isStringComparator = (v: string): v is StringComparator => Object.values<string>(StringComparator).includes(v);



export type Condition =
    | { type: DVMType.String, operator: StringComparator, valueSet: { left: (string | null), right: (string | null) } }
    | { type: DVMType.Uint64, operator: Uint64Comparator, valueSet: { left: (number | null), right: (number | null) } }



export type ConditionNodeData = {
    condition: Condition
}


export type LetNodeData = {
    let: Let
}

export type VariableNodeData = {
    variable: { name: string }
}

export type Dim = {
    name: string,
    type: DVMType
}

export type Let = {
    name: string,
    in: StringType | Uint64Type,
}


export type FunctionNodeData = {
    function: DVMFunction
}

export enum Uint64Operator {
    Add = '+',
    Subtract = '-',
    Multiply = '*',
    Divide = '/',
    Modulo = '%',
    BitwiseAnd = '&',
    BitwiseOr = '|',
    BitwiseXOr = '^',
    BitwiseNot = '!',
    BitwiseRightShift = '>>',
    BitwiseLeftShift = '<<',
}

export const isUint64Operator = (v: string): v is Uint64Operator => Object.values<string>(Uint64Operator).includes(v);

export enum StringOperator {
    Concatenate = '+',
}

export const isStringOperator = (v: string): v is StringOperator => Object.values<string>(StringOperator).includes(v);

export type Operation =
    | { type: DVMType.String, operator: StringOperator, valueSet: { left: string | null, right: string | null } }
    | { type: DVMType.Uint64, operator: Uint64Operator, valueSet: { left: number | null, right: number | null } }

export type OperationNodeData = {
    operation: Operation
}


export type ProcessNodeData = {
    process: {
        name: string,
    }
}




export type NodeLinkFrom = { id: number, output: number }
export type NodeLinkTo = { id: number, input: number }
export type NodeLink = {
    from: NodeLinkFrom,
    to: NodeLinkTo,
    type: Connector,
}



export type ConnectionData = {
    inputs: { [i: number]: Connection },
    outputs: { [o: number]: Connection },
}

export type Connection = {
    position: {
        x: number,
        y: number
    }
} & Connector

export type Connector =
    | { type: 'flow' }
    | { type: 'value', valueType: 'String' | 'Uint64' | 'Variable' }


type NodesImmerReducer = (draft: WritableDraft<Nodes>, reduce: NodesReduce) => void






export enum NodesAction {
    AddNode = 'add node',
    UpdateNodePosition = 'update node position',
    UpdateNodeEditMode = 'update node edit mode',
    EditNode = 'edit node',
    EditNodeArgValue = "EditArgValue",
    DeleteNode = 'delete node',

}


type AddNodeAction = {
    action: NodesAction.AddNode,
    data: Node,
}

type UpdateNodePositionAction = {
    action: NodesAction.UpdateNodePosition,
    data: NodePosition,
}

type UpdateNodeEditModeAction = {
    action: NodesAction.UpdateNodeEditMode,
    data: { id: number, edit: boolean },
}

type EditNodeAction = {
    action: NodesAction.EditNode,
    data: { id: number, newData: NodeData },
}

type EditNodeArgValueAction = {
    action: NodesAction.EditNodeArgValue,
    data: { id: number, arg: string, valueSet: any },
}

type DeleteNodeAction = {
    action: NodesAction.DeleteNode,
    data: { id: number }
}

export type NodesReduce =
    | AddNodeAction
    | UpdateNodePositionAction
    | UpdateNodeEditModeAction
    | EditNodeAction
    | EditNodeArgValueAction
    | DeleteNodeAction


export const nodesImmerReducer: NodesImmerReducer = (draft, action) => {

    return match(action)
        .with({ action: NodesAction.UpdateNodePosition }, ({ data }: UpdateNodePositionAction) => {
            if (data.id in draft) {
                draft[data.id].position = data.position;
            } else {
                console.error('node not found');
            }
        })
        .with({ action: NodesAction.UpdateNodeEditMode }, ({ data }: UpdateNodeEditModeAction) => {
            if (data.id in draft) {
                draft[data.id].edit = data.edit;
            } else {
                console.error('node not found');
            }
        })
        .with({ action: NodesAction.EditNode }, ({ data }: EditNodeAction) => {
            if (data.id in draft) {
                draft[data.id].data = data.newData;
            } else {
                console.error('node not found');
            }
        })
        .with({ action: NodesAction.EditNodeArgValue }, ({ data }: EditNodeArgValueAction) => {
            if (data.id in draft) {
                const node = draft[data.id].data;
                if (node.type == NodeDataKind.Function) {
                    // @ts-ignore //! ignored
                    node.function.args[data.arg as keyof typeof node.function.args].valueSet = data.valueSet;
                } else if (node.type == NodeDataKind.Condition) {
                    // @ts-ignore //! ignored
                    node.condition.valueSet[data.arg] = data.valueSet;
                } else if (node.type == NodeDataKind.Operation) {
                    // @ts-ignore //! ignored
                    node.operation.valueSet[data.arg] = data.valueSet;
                }
            } else {
                console.error('node not found');
            }
        })
        .with({ action: NodesAction.DeleteNode }, ({ data }: DeleteNodeAction) => {
            if (data.id in draft) {
                if (!draft[data.id].locked) {
                    delete draft[data.id];
                } else {
                    console.warn('node is locked');
                }
            } else {
                console.error('node not found');
            }
        })
        .with({ action: NodesAction.AddNode }, ({ data }: AddNodeAction) => {
            const newId = Math.max(...Object.keys(draft).map(k => Number(k))) + 1;
            draft[newId] = data;
        })
        .exhaustive();

}
