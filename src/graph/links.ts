import { WritableDraft } from "immer/dist/internal"
import { match } from "ts-pattern"
import { Links } from "./graph"
import { NodeLink } from "./nodes"


export enum LinksAction {
    Add = 'add',
    Remove = 'remove',
    RemoveRelated = 'remove related',
}

type AddLinkAction = {
    action: LinksAction.Add,
    data: NodeLink,
}
type RemoveLinkAction = {
    action: LinksAction.Remove,
    data: NodeLink,
}
type RemoveRelatedLinksAction = {
    action: LinksAction.RemoveRelated,
    data: { nodeId: number },
}

export type LinksReduce =
    | AddLinkAction
    | RemoveRelatedLinksAction
    | RemoveLinkAction

export const linkEquals = (l1: NodeLink, l2: NodeLink) =>
    l1.from.id == l2.from.id
    && l1.from.output == l2.from.output
    && l1.to.id == l2.to.id
    && l1.to.input == l2.to.input


type LinksImmerReducer = (draft: WritableDraft<Links>, reduce: LinksReduce) => void

export const linksImmerReducer: LinksImmerReducer = (draft, action) => {
    return match(action)
        .with({ action: LinksAction.Add }, ({ data }: AddLinkAction) => {
            if (draft.find(link => linkEquals(link, data))) {
                console.warn('link exists');
            } else {

                const existing = match(data.type.type)
                    .with('flow', _ => {
                        console.warn('flow');
                        
                        return draft.findIndex(
                            link => link.from.id == data.from.id
                                && link.from.output == data.from.output
                        )
                    })
                    .with('value', _ => {
                        console.warn('value');
                        return draft.findIndex(
                            link => (link.from.id == data.from.id
                                && link.from.output == data.from.output)
                                || (link.to.id == data.to.id
                                && link.to.input == data.to.input))
                    })
                    .exhaustive()


                if (existing >= 0) {
                    console.warn('replaced link');

                    draft[existing] = data;
                } else {
                    draft.push(data);
                }
            }
        })
        .with({ action: LinksAction.RemoveRelated }, ({ data }: RemoveRelatedLinksAction) => {
            return draft.filter(link => link.from.id != data.nodeId
                && link.to.id != data.nodeId)
        })
        .with({ action: LinksAction.Remove }, ({ data }: RemoveLinkAction) => {
            return draft.filter(link => !linkEquals(link, data));
        })
        .exhaustive()
}

