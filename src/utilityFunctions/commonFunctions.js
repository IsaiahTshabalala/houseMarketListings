/**
 * File: ./src/utilityFunctions/commonFunctions.js
 * -----------------------------------------------------------------------------
 * Description: provides functions for validation of fields.
 * NB. For front-end use only!! The regExes herein may expose an application to regEx attacks if used at backend.
 * -------------------------------------------------------------------------------------------------------------
 * Start Date  End Date     Dev   Version  Description
 * 2023/07/28               ITA   1.00     Genesis.
 * 2024/05/08               ITA   1.01     Rename function timeStampYyyyMmHh to timeStampYyyyMmDd.
 * 2024/06/30               ITA   1.03     Fix indentation.
 *                                         Each function description to be put on top of, before each function, as as to be displayed on the documentation tip.
 *                                         Eliminate functions not in use: diff and diffObjArray.
 *                                         Add new functions to facilitate searching of arrays (primitive and object types) and elimination of duplicates in arrays of objects,
 *                                         as well as comparison of values (primitive and object types).
 * 2024/08/14               ITA   1.04     Provide the alternative formatting to the prices. The previously used method is not consistent across browsers.
 * 2024/08/15               ITA   1.05     Currency format: replace ZAR with R. Ths is better suited for local purposes.
 * 2024/10/19               ITA   1.06     Add hasAll and hasOnly functions, to be able to validate objects for presence of certain fields.
 * 2026/01/07  2026/01/07   ITA   1.07     Moved a number of functions to an external package, some-common-functions-js, for reusability.
 */

export function isValidDescription(value) {
    return /^[0-9a-zA-Z ,//.-]{1,250}$/gi.test(value);
}

export function isValidShortDescription(value) {
    return isValidDescription(value)
            && value.length <= 50;
}

export function isValidStreetNo(value) {
    return /^[0-9a-zA-Z]+([/\- ][0-9a-zA-Z]+)*$/gi.test(value);
}

export function isValidMobileNo(value) {
    return /^[0-9]{10,15}$/gi.test(value);
}



export function isValidNumBedrooms(value) {
    if (/^[0-9]{1,2}$/.test(value) === false)
        return false;

    const number = Number.parseInt(value);
    return number >= 0 && number <= 10;
} // export function isValidNumBedrooms(value) {

export function isValidInteger(value) {
    return /^-?[0-9]+$/.test(value);
} // export function isValidInteger(value) {

export function isValidNaturalNumber(value) {
    if (isValidInteger(value))
        return Number.parseInt(value) > 0;
} // export function isValidNaturalNumber(value) {

export function isValidWholeNumber(value) {
    if (isValidInteger(value))
        return Number.parseInt(value) >= 0;
} // export function isValidWholeNumber(value) {

export function isValidDecimalNumber(value) {
    return isValidInteger(value)
            || /^-?[0-9]+.[0-9]{1,9}$/.test(value);
} // export function isValidDecimalNumber(value) {

export function isValidPositiveDecimalNumber(value) {
    return isValidDecimalNumber(value)
            && Number.parseFloat(value) > 0;
  } // export function isPositiveDecimalNumber(value) {

  export function isValidZeroOrGreaterDecimalNumber(value) {
    return isValidDecimalNumber(value) 
           && Number.parseFloat(value) >= 0
  } // export function isZeroOrGreaterDecimalNumber(value) {

/** Check whether a variable has values at all. To be used only on Object, Array and Primitive types.
 * The following variables are considered to have no values:
 * 1. Empty arrays.
 * 
 * 1. Objects with only undefined or null values.
 * 
 * 2. Primitive types with undefined or null values.
*/
export function hasValues(variable) {
    if (Object.prototype.toString.call(variable) === '[object Object]') {
        // Check for existence of errors
        for (const key in variable) {
            // Check if the field is an object
            if (Object.prototype.toString.call(variable[key]) === '[object Object]') {
                if (hasValues(variable[key]))
                    return true;
            }                    
            else if (variable instanceof Array) {
                if (variable.length > 0)
                    return true;
            }
            else if (variable[key] !== undefined
                    && variable[key] !== null) {
                return true;
            }
        } // for (const key in variable) {
    } // if (Object.prototype.toString.call(variable[key]) === '[object Object]') {
    else if (variable instanceof Array) {
        return (variable.length > 0);
    }
    else
        return (variable !== undefined
                && variable !== null);
    
    return false;
} //export function hasValues(variable) {


/** Create a document object from a File instance. */
export function objectFromFile(fileInstance) {
    return {      
        lastModified: fileInstance.lastModified,
        name: fileInstance.name,
        size: fileInstance.size,
        type: fileInstance.type,
        webkitdirectory: fileInstance.webkitdirectory
    };
} // export function objectFromFile(fileInstance) {

export function fileSizeKiB(fileInstance) {    
    const size = Number.parseInt(fileInstance.size);
    return Math.round(size / 1024);
}

export function fileSizeMiB(fileInstance) {
    return fileSizeKiB(fileInstance) / 1024;
}
