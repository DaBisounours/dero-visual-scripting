import { DVMDimLet } from "../graph/nodes";

export type Variable = string | Uint64 | null;
export type VariableType = { type: "Variable", valueSet: Variable }
export type StringType = { type: DVMType.String, valueSet: string | null }
export type Uint64 = number | null;
export type Uint64Type = { type: DVMType.Uint64, valueSet: Uint64 }
export type Condition = string;
export type Expression = any;

export enum DVMType {
    Uint64 = "Uint64",
    String = "String",
    Variable = "Variable",
}

export enum DVM {
    VERSION = 'VERSION',
    LOAD = 'LOAD',
    EXISTS = 'EXISTS',
    STORE = 'STORE',
    DELETE = 'DELETE',
    MAPEXISTS = 'MAPEXISTS',
    MAPGET = 'MAPGET',
    MAPSTORE = 'MAPSTORE',
    MAPDELETE = 'MAPDELETE',
    RANDOM = 'RANDOM',
    SCID = 'SCID',
    BLID = 'BLID',
    TXID = 'TXID',
    DERO = 'DERO',
    BLOCK_HEIGHT = 'BLOCK_HEIGHT',
    BLOCK_TIMESTAMP = 'BLOCK_TIMESTAMP',
    SIGNER = 'SIGNER',
    UPDATE_SC_CODE = 'UPDATE_SC_CODE',
    IS_ADDRESS_VALID = 'IS_ADDRESS_VALID',
    ADDRESS_RAW = 'ADDRESS_RAW',
    ADDRESS_STRING = 'ADDRESS_STRING',
    SEND_DERO_TO_ADDRESS = 'SEND_DERO_TO_ADDRESS',
    SEND_ASSET_TO_ADDRESS = 'SEND_ASSET_TO_ADDRESS',
    DEROVALUE = 'DEROVALUE',
    ASSETVALUE = 'ASSETVALUE',
    ATOI = 'ATOI',
    ITOA = 'ITOA',
    SHA256 = 'SHA256',
    SHA3256 = 'SHA3256',
    KECCAK256 = 'KECCAK256',
    HEX = 'HEX',
    HEXDECODE = 'HEXDECODE',
    MIN = 'MIN',
    MAX = 'MAX',
    STRLEN = 'STRLEN',
    SUBSTR = 'SUBSTR',
    // PANIC = 'PANIC',
}

export type DVMFunction =

    //VERSION(v String)
    //Description: Sets a version to dvm.VERSION. Returns 1 if successful, panics otherwise.
    //Return Type: Uint64
    //ComputeCost: 1000
    //StorageCost: 0
    | { name: DVM.VERSION, args: { v: StringType }, return: DVMType.Uint64 }

    //LOAD(variable)
    //Description: Loads a variable which was previously stored in the blockchain using STORE function. Return type will depend on what is stored. It will panic if the value does NOT exist.
    //Return Type: Uint64/String (depending what is stored)
    //ComputeCost: 5000
    //StorageCost: 0
    | { name: DVM.LOAD, args: { variable: VariableType }, return: DVMType.Variable }

    //EXISTS(variable)
    //Description: Return 1 if the variable is stored in DB via STORE and 0 otherwise.
    //Return Type: Uint64
    //ComputeCost: 5000
    //StorageCost: 0
    | { name: DVM.EXISTS, args: { variable: VariableType }, return: DVMType.Uint64 }

    //STORE(key variable, value variable)
    //Description: Stores key and value in the DB. All storage state of the SC is accessible only from the SC which created it. Returns 1.
    //Return Type: Uint64
    //ComputeCost: 10000
    //StorageCost: 0
    | { name: DVM.STORE, args: { key: VariableType, value: VariableType }, return: DVMType.Uint64, asProcess: boolean }

    //DELETE(variable)
    //Description: Sets the rawkey value to []byte{} effectively deleting it from storage. Returns 1.
    //Return Type: Uint64
    //ComputeCost: 3000
    //StorageCost: 0
    | { name: DVM.DELETE, args: { variable: VariableType }, return: DVMType.Uint64, asProcess: boolean }

    //MAPEXISTS(variable)
    //Description: Returns 1 if the variable has been stored in RAM (current invoke session) via MAPSTORE and 0 otherwise.
    //Return Type: Uint64
    //ComputeCost: 1000
    //StorageCost: 0
    | { name: DVM.MAPEXISTS, args: { variable: VariableType }, return: DVMType.Uint64 }

    //MAPGET(variable)
    //Description: Loads a variable which was previously stored in RAM (current invoke session) via MAPSTORE. Return type will depend on what is stored. I twill panic if the value does NOT exist.
    //Return Type: Uint64/String (depending on what is stored)
    //ComputeCost: 1000
    //StorageCost: 0
    | { name: DVM.MAPGET, args: { variable: VariableType }, return: DVMType.Uint64 }

    //MAPSTORE(key variable, value variable)
    //Description: Stores key and value in RAM (current invoke session). All MAPSTORE state is accessible only from the session in which it is stored. Returns 1.
    //Return Type: Uint64
    //ComputeCost: 1000
    //StorageCost: 0
    | { name: DVM.MAPSTORE, args: { key: StringType, value: VariableType }, return: DVMType.Uint64, asProcess: boolean }

    //MAPDELETE(variable)
    //Description: Deletes the element from the map in RAM (current invoke session). If the key does not exist, delete has no action. Returns 1.
    //Return Type: Uint64
    //ComputeCost: 1000
    //StorageCost: 0
    | { name: DVM.MAPDELETE, args: { variable: VariableType }, return: DVMType.Uint64, asProcess: boolean }

    //RANDOM(limit Uint64)
    //Description: RANDOM returns a random using a PRNG seeded on BLID,SCID,TXID. First form gives a uint64, second form returns random number in the range 0 - (limit), 0 is inclusive, limit is exclusive.
    //Return Type: Uint64
    //ComputeCost: 2500
    //StorageCost: 0
    | { name: DVM.RANDOM, args: { limit: Uint64Type }, return: DVMType.Uint64 }

    //SCID()
    //Description: Returns SMART CONTRACT ID which is currently running.
    //Return Type: String
    //ComputeCost: 2000
    //StorageCost: 0
    | { name: DVM.SCID, args: {}, return: DVMType.String }

    //BLID()
    //Description: Returns current BLOCK ID which contains current execution-in-progress TXID.
    //Return Type: String
    //ComputeCost: 2000
    //StorageCost: 0
    | { name: DVM.BLID, args: {}, return: DVMType.String }

    //TXID()
    //Description: Returns current TXID which is execution-in-progress.
    //Return Type: String
    //ComputeCost: 2000
    //StorageCost: 0
    | { name: DVM.TXID, args: {}, return: DVMType.String }

    //DERO()
    //Description: Returns a string representation of zerohash which is of type crypto.Hash.
    //Return Type: String
    //ComputeCost: 10000
    //StorageCost: 0
    | { name: DVM.DERO, args: {}, return: DVMType.String }

    //BLOCK_HEIGHT()
    //Description: Returns current chain height of BLID().
    //Return Type: Uint64
    //ComputeCost: 2000
    //StorageCost: 0
    | { name: DVM.BLOCK_HEIGHT, args: {}, return: DVMType.Uint64 }

    //BLOCK_TIMESTAMP()
    //Description: Returns current timestamp of BLID().
    //Return Type: Uint64
    //ComputeCost: 2500
    //StorageCost: 0
    | { name: DVM.BLOCK_TIMESTAMP, args: {}, return: DVMType.Uint64 }

    //SIGNER()
    //Description: Returns address of who signed this transaction. Ringsize of tx must be 2 for this value to be known or else empty.
    //Return Type: String
    //ComputeCost: 5000
    //StorageCost: 0
    | { name: DVM.SIGNER, args: {}, return: DVMType.String }

    //UPDATE_SC_CODE(sc_code String)
    //Description: Stores updated SC code of type string. If it is not of type string, return 0, else return 1.
    //Return Type: Uint64
    //ComputeCost: 5000
    //StorageCost: 0
    | { name: DVM.UPDATE_SC_CODE, args: { sc_code: StringType }, return: DVMType.Uint64, asProcess: boolean }

    //IS_ADDRESS_VALID(address String)
    //Description: Returns 1 if address is valid, 0 otherwise.
    //Return Type: Uint64
    //ComputeCost: 50000
    //StorageCost: 0
    | { name: DVM.IS_ADDRESS_VALID, args: { address: StringType }, return: DVMType.Uint64 }

    //ADDRESS_RAW(address String)
    //Description: Returns address in RAW form as 33 byte keys, stripping away textual/presentation form. 2 address should always be compared in RAW form.
    //Return Type: String
    //ComputeCost: 60000
    //StorageCost: 0
    | { name: DVM.ADDRESS_RAW, args: { address: StringType }, return: DVMType.String }

    //ADDRESS_STRING(p String)
    //Description: Returns address in STRING form. If it can be evaluated, a string form of an address will be returned, otherwise return an empty string.
    //Return Type: String
    //ComputeCost: 50000
    //StorageCost: 0
    | { name: DVM.ADDRESS_STRING, args: { p: StringType }, return: DVMType.String }

    //SEND_DERO_TO_ADDRESS(a String, amount Uint64)
    //Description: Sends amount DERO from SC DERO balance to a address which should be raw form. Address must be in string DERO/DETO form. If the SC does not have enough balance, it will panic.
    //Return Type: Uint64
    //ComputeCost: 70000
    //StorageCost: 0
    | { name: DVM.SEND_DERO_TO_ADDRESS, args: { a: StringType, amount: Uint64Type }, return: DVMType.Uint64, asProcess: boolean }

    //SEND_ASSET_TO_ADDRESS(a String, amount Uint64, asset String)
    //Description: Sends amount ASSET from SC ASSET balance to a address which should be raw form. Address must be in string DERO/DETO form. If the SC does not have enough balance, it will panic.
    //Return Type: Uint64
    //ComputeCost: 90000
    //StorageCost: 0
    | { name: DVM.SEND_ASSET_TO_ADDRESS, args: { a: StringType, amount: Uint64Type, asset: StringType }, return: DVMType.Uint64, asProcess: boolean }

    //DEROVALUE()
    //Description: Gets the amount of DERO sent within this transaction.
    //Return Type: Uint64
    //ComputeCost: 10000
    //StorageCost: 0
    | { name: DVM.DEROVALUE, args: {}, return: DVMType.Uint64 }

    //ASSETVALUE(asset String)
    //Description: Gets the amount of a given ASSET sent within this transaction.
    //Return Type: Uint64
    //ComputeCost: 10000
    //StorageCost: 0
    | { name: DVM.ASSETVALUE, args: { asset: StringType }, return: DVMType.Uint64 }

    //ATOI(s String)
    //Description: Returns a Uint64 representation of a string. Else panic.
    //Return Type: Uint64
    //ComputeCost: 5000
    //StorageCost: 0
    | { name: DVM.ATOI, args: { s: StringType }, return: DVMType.Uint64 }

    //ITOA(n Uint64)
    //Description: Returns string representation of a Uint64. Else panic.
    //Return Type: String
    //ComputeCost: 5000
    //StorageCost: 0
    | { name: DVM.ITOA, args: { n: Uint64Type }, return: DVMType.String }

    //SHA256(s String)
    //Description: Returns a string sha2-256 hash of a given string. Else panic.
    //Return Type: String
    //ComputeCost: 25000
    //StorageCost: 0
    | { name: DVM.SHA256, args: { s: StringType }, return: DVMType.String }

    //SHA3256(s String)
    //Description: Returns a string sha3-256 hash of a given string. Else panic.
    //Return Type: String
    //ComputeCost: 25000
    //StorageCost: 0
    | { name: DVM.SHA3256, args: { s: StringType }, return: DVMType.String }

    //KECCAK256(s String)
    //Description: Returns a string sha3-keccak256 hash of a given string. Else panic.
    //Return Type: String
    //ComputeCost: 25000
    //StorageCost: 0
    | { name: DVM.KECCAK256, args: { s: StringType }, return: DVMType.String }

    //HEX(s String)
    //Description: Returns a hex encoded string value of a given string. Else panic.
    //Return Type: String
    //ComputeCost: 10000
    //StorageCost: 0
    | { name: DVM.HEX, args: { s: StringType }, return: DVMType.String }

    //HEXDECODE(s String)
    //Description: Returns a hex decoded string value of a given hex string. Else panic.
    //Return Type: String
    //ComputeCost: 10000
    //StorageCost: 0
    | { name: DVM.HEXDECODE, args: { s: StringType }, return: DVMType.String }

    //MIN(f Uint64, s Uint64)
    //Description: Returns the minimum value of 2 Uint64 values. Else panic.
    //Return Type: Uint64
    //ComputeCost: 5000
    //StorageCost: 0
    | { name: DVM.MIN, args: { f: Uint64Type, s: Uint64Type }, return: DVMType.Uint64 }

    //MAX(f Uint64, s Uint64)
    //Description: Returns the maximum value of 2 Uint64 values. Else panic.
    //Return Type: Uint64
    //ComputeCost: 5000
    //StorageCost: 0
    | { name: DVM.MAX, args: { f: Uint64Type, s: Uint64Type }, return: DVMType.Uint64 }

    //STRLEN(s String)
    //Description: Returns the length of a given string in Uint64. Else panic.
    //Return Type: Uint64
    //ComputeCost: 20000
    //StorageCost: 0
    | { name: DVM.STRLEN, args: { s: StringType }, return: DVMType.Uint64 }

    //SUBSTR(s String, offset Uint64, length Uint64)
    //Description: Returns the substring of a given string with offset and length defined. Else panic.
    //Return Type: String
    //ComputeCost: 20000
    //StorageCost: 0
    | { name: DVM.SUBSTR, args: { offset: Uint64Type, length: Uint64Type }, return: DVMType.String }



//Description: Panics.
//Return Type: Panic
//ComputeCost: 10000
//StorageCost: 0
//| { name: DVM.PANIC, args: {} } // Handled in END



export const defaultDVMFunctionMap: { [d in DVM]: DVMFunction } = {
    [DVM.VERSION]: {
        name: DVM.VERSION,
        args: {
            v: { type: DVMType.String, valueSet: null }
        },
        return: DVMType.Uint64,
    },
    [DVM.LOAD]: {
        name: DVM.LOAD,
        args: {
            variable: {type: DVMType.Variable, valueSet: null}
        }, return: DVMType.Variable
    },
    [DVM.EXISTS]: {
        name: DVM.EXISTS,
        args: {
            variable: {type: DVMType.Variable, valueSet: null}
        }, return: DVMType.Uint64
    },
    [DVM.STORE]: {
        name: DVM.STORE,
        args: {
            key: {type: DVMType.Variable, valueSet: null},
            value:  {type: DVMType.Variable, valueSet: null},
        }, return: DVMType.Uint64, asProcess: true
    },
    [DVM.DELETE]: {
        name: DVM.DELETE,
        args: {
            variable: {type: DVMType.Variable, valueSet: null}
        }, return: DVMType.Uint64, asProcess: true
    },
    [DVM.MAPEXISTS]: {
        name: DVM.MAPEXISTS,
        args: {
            variable: {type: DVMType.Variable, valueSet: null}
        }, return: DVMType.Uint64
    },
    [DVM.MAPGET]: {
        name: DVM.MAPGET,
        args: {
            variable: {type: DVMType.Variable, valueSet: null}
        }, return: DVMType.Uint64
    },
    [DVM.MAPSTORE]: {
        name: DVM.MAPSTORE,
        args: {
            key: {type: DVMType.String, valueSet: null},
            value:  {type: DVMType.Variable, valueSet: null},
        }, return: DVMType.Uint64, asProcess: true
    },
    [DVM.MAPDELETE]: {
        name: DVM.MAPDELETE,
        args: {
            variable: {type: DVMType.Variable, valueSet: null}
        }, return: DVMType.Uint64, asProcess: true
    },
    [DVM.RANDOM]: {
        name: DVM.RANDOM,
        args: {
            limit: {type: DVMType.Uint64, valueSet: null}, // To get a binary random
        }, return: DVMType.Uint64
    },
    [DVM.SCID]: {
        name: DVM.SCID,
        args: {}, 
        return: DVMType.String
    },
    [DVM.BLID]: {
        name: DVM.BLID,
        args: {}, 
        return: DVMType.String
    },
    [DVM.TXID]: {
        name: DVM.TXID,
        args: {},
        return: DVMType.String
    },
    [DVM.DERO]: {
        name: DVM.DERO,
        args: {},
        return: DVMType.String
    },
    [DVM.BLOCK_HEIGHT]: {
        name: DVM.BLOCK_HEIGHT,
        args: {}, return: DVMType.Uint64
    },
    [DVM.BLOCK_TIMESTAMP]: {
        name: DVM.BLOCK_TIMESTAMP,
        args: {}, return: DVMType.Uint64
    },
    [DVM.SIGNER]: {
        name: DVM.SIGNER,
        args: {}, return: DVMType.String
    },
    [DVM.UPDATE_SC_CODE]: {
        name: DVM.UPDATE_SC_CODE,
        args: {
            sc_code: {type: DVMType.String, valueSet: null},
        }, return: DVMType.Uint64, asProcess: true
    },
    [DVM.IS_ADDRESS_VALID]: {
        name: DVM.IS_ADDRESS_VALID,
        args: {
            address: {type: DVMType.String, valueSet: null},
        }, return: DVMType.Uint64
    },
    [DVM.ADDRESS_RAW]: {
        name: DVM.ADDRESS_RAW,
        args: {
            address: {type: DVMType.String, valueSet: null},
        }, return: DVMType.String
    },
    [DVM.ADDRESS_STRING]: {
        name: DVM.ADDRESS_STRING,
        args: {
            p: {type: DVMType.String, valueSet: null},
        }, return: DVMType.String
    },
    [DVM.SEND_DERO_TO_ADDRESS]: {
        name: DVM.SEND_DERO_TO_ADDRESS,
        args: {
            a: {type: DVMType.String, valueSet: null},
            amount: {type: DVMType.Uint64, valueSet: null},
        }, return: DVMType.Uint64, asProcess: true
    },
    [DVM.SEND_ASSET_TO_ADDRESS]: {
        name: DVM.SEND_ASSET_TO_ADDRESS,
        args: {
            a: {type: DVMType.String, valueSet: null},
            amount: {type: DVMType.Uint64, valueSet: null},
            asset: {type: DVMType.String, valueSet: null},
        }, return: DVMType.Uint64, asProcess: true
    },
    [DVM.DEROVALUE]: {
        name: DVM.DEROVALUE,
        args: {}, return: DVMType.Uint64
    },
    [DVM.ASSETVALUE]: {
        name: DVM.ASSETVALUE,
        args: {
            asset: {type: DVMType.String, valueSet: null},
        }, return: DVMType.Uint64
    },
    [DVM.ATOI]: {
        name: DVM.ATOI,
        args: {
            s: {type: DVMType.String, valueSet: null}
        }, return: DVMType.Uint64
    },
    [DVM.ITOA]: {
        name: DVM.ITOA,
        args: {
            n: {type: DVMType.Uint64, valueSet: null},
        }, return: DVMType.String
    },
    [DVM.SHA256]: {
        name: DVM.SHA256,
        args: {
            s: {type: DVMType.String, valueSet: null}
        }, return: DVMType.String
    },
    [DVM.SHA3256]: {
        name: DVM.SHA3256,
        args: {
            s: {type: DVMType.String, valueSet: null}
        }, return: DVMType.String
    },
    [DVM.KECCAK256]: {
        name: DVM.KECCAK256,
        args: {
            s: {type: DVMType.String, valueSet: null}
        }, return: DVMType.String
    },
    [DVM.HEX]: {
        name: DVM.HEX,
        args: {
            s: {type: DVMType.String, valueSet: null}
        }, return: DVMType.String
    },
    [DVM.HEXDECODE]: {
        name: DVM.HEXDECODE,
        args: {
            s: {type: DVMType.String, valueSet: null}
        }, return: DVMType.String
    },
    [DVM.MIN]: {
        name: DVM.MIN,
        args: {
            f: {type: DVMType.Uint64, valueSet: null},
            s: {type: DVMType.Uint64, valueSet: null},
        }, return: DVMType.Uint64
    },
    [DVM.MAX]: {
        name: DVM.MAX,
        args: {
            f: {type: DVMType.Uint64, valueSet: null},
            s: {type: DVMType.Uint64, valueSet: null},
        }, return: DVMType.Uint64
    },
    [DVM.STRLEN]: {
        name: DVM.STRLEN,
        args: {
            s: {type: DVMType.String, valueSet: null}
        }, return: DVMType.Uint64
    },
    [DVM.SUBSTR]: {
        name: DVM.SUBSTR,
        args: {
            offset: {type: DVMType.Uint64, valueSet: null},
            length: {type: DVMType.Uint64, valueSet: null},
        }, return: DVMType.String
    },

}

export const defaultDimLet: DVMDimLet = {
    name: "var",
    args: {
        in: {
            type: DVMType.String,
            valueSet: null
        }
    },
    return: {
        type: DVMType.String,
        valueSet: null
    }
}