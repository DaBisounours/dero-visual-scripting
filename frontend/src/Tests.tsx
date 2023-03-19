import { useAtom } from "jotai";
import { useEffect } from "react";
import { functionsAtom } from "./graph/graph";

export const Tests = () => {
    const [functions, setFunctions] = useAtom(functionsAtom);

    useEffect(() => { 
        console.log({functions});
    }, [functions])

    return <>
    
    </>
}