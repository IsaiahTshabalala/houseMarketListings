/**File: ./src/hooks/BackupStore.js
 * Description:
 * Object to help with the form edit functionality.
 * =======================================================================================
 * Start Date  End Date   Dev  Version   Description
 * 2026/01/12  2026/02/06 ITA  1.00      Genesis.
 */
import { useState } from "react";
import { deepClone, get as objGet, set, unset, getPaths as objGetPaths } from "some-common-functions-js";
import { hasValues as objHasValues } from "../utilityFunctions/commonFunctions";

export function useBackupStore() {
    const [backupStore, setBackupStore] = useState({});

    /**Store a value at the specified path */
    function store(path, data) {
        setBackupStore(prevStore => {
            const temp = deepClone(prevStore);
            set(temp, path, data);
            return temp;
        });
    }

    function get(path) {
        return objGet(backupStore, path);
    }

    function getAndClear(path) {
        const value = get(path);
        setBackupStore(prevStore=> {
            const temp = deepClone(prevStore);
            unset(temp, path);
            return temp;        
        });
        return value;
    }

    /**Reset the backup store to empty */
    function clearAll() {
        setBackupStore({});
    }

    function hasValues() {
        return objHasValues(backupStore);
    }

    function getPaths() {
        return objGetPaths(backupStore);
    }

    /**Return an updated version of the state object if its value at the specified path differs with that
     * backupStore value at the specified path. The updated object is updated with the value of the backup store
     * at the specified path.
     * 
     * If there are no differences in value at the specified path, return null.
     * 
     * Also clear the backupStore value at the specified path.
     * @param {object} stateObject 
     * @param {string} path full path to the value, starting with the state name. e.g. 'gisCodes.provinces'
     * @returns {object} an object whose value has been updated with the backup value at the specified path.
    */
    function getUpdatedIfDiff(stateObject, path) {
        path = path.replace(/-/gi, '.');
        const stateName = path.split('.')[0];
        const subPath = path.substring(stateName.length + 1);
        const currentValue = objGet(stateObject, subPath);
        const backupValue = getAndClear(path);

        /*  A backup value must exist at the path of the backupStore.
            A value must exist at the field path of the state object.
            A backup value must not be equal to the value of the object the field path.
        */
        if ((backupValue === undefined) || (currentValue === undefined) || (backupValue === currentValue))
            return null;

        const updateObj = deepClone(stateObject);
        set(updateObj, subPath, backupValue);
        return updateObj;
    }

    return {
        clearAll,
        store,
        get,
        getAndClear,
        getUpdatedIfDiff,
        getPaths,
        hasValues
    };
}