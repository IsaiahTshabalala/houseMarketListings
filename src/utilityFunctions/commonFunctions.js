/**
 * File: ./src/utilityFunctions/commonFunctions.js
 * -----------------------------------------------------------------------------
 * Description: provides functions for validation of fields.
 * NB. For front-end use only!! The regExes herein may expose an application to regEx attacks if used at backend.
 * -------------------------------------------------------------------------------------------------------------
 * Date        Dev   Version  Description
 * 2023/07/28  ITA   1.00     Genesis.
 * 2024/05/08  ITA   1.01     Rename function timeStampYyyyMmHh to timeStampYyyyMmDd.
 * 2024/06/30  ITA   1.03     Fix indentation.
 *                            Each function description to be put on top of, before each function, as as to be displayed on the documentation tip.
 *                            Eliminate functions not in use: diff and diffObjArray.
 *                            Add new functions to facilitate searching of arrays (primitive and object types) and elimination of duplicates in arrays of objects,
 *                            as well as comparison of values (primitive and object types).
 * 2024/08/14   ITA  1.04     Provide the alternative formatting to the prices. The previously used method is not consistent across browsers.
 * 2024/08/15   ITA  1.05     Currency format: replace ZAR with R. Ths is better suited for local purposes.
 * 2024/10/19   ITA  1.06     Add hasAll and hasOnly functions, to be able to validate objects for presence of certain fields.
 */
const loDash = require('lodash');

export function isValidPassword(password) {
    // Password must be at least 6 characters long
    
    if (password.length < 6)
        return false;

    // Must contain at least 1 uppercase letter
    if (/[A-Z]/g.test(password) === false)
        return false;
    
      // Must contain at least 1 lowercase letter
    if (/[a-z]/g.test(password) === false)
        return false;
    
    // Must contain at least 1 number
    if (/[0-9]/g.test(password) === false)
        return false;

    // Must not contain white space characters
    if (/[\s]/.test(password))
        return false;
    
    // Must contain atleast 1 symbol
    if (/[\][!"#$%&'()*+,./:;<=>?@^\\_`{|}~-]/g.test(password) === false)
        return false;
  
    return true;
} // export function isValidPassword(password)

export function isValidName(value) {
    return /^[a-zA-Z -]{1,50}$/gi.test(value);
}

export function isValidDisplayName(value) {
    return isValidName(value);
}

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

export function isValidPhoneNo(value) {
    return isValidMobileNo(value);
}

export function isValidEmail(value) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/gi.test(value);
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
 * 1. Objects with only undefined or null values.
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

/** Get all the field paths of an object, including the nested ones, that an object has.
 * Example, when called on the object 
 *          {
 *              description: 'Chair',
 *              priceInfo: {
 *                  regularPrice: 200,
 *                  discountedPrice: 100
 *              }
 *          }, 
 * getPaths(anObject) will return an array ['description', 'priceInfo.discountedPrice', 'priceInfo.regularPrice']
 */
export function getPaths(anObject) {
    const paths = [];
    if (!(Object.prototype.toString.call(anObject) === '[object Object]'))
        return paths;
    
    for (const path in anObject) {
        const nestedPaths = getPaths(anObject[path]);
        if (nestedPaths.length > 0) {
            nestedPaths.forEach(nestedPath=> {
                paths.push(path + '.' + nestedPath); 
            });
        }
        else
            paths.push(path);
    }
    return paths;
} // export function getPaths()

/** Return an object with sorted fields, by ordered by field name.
 * This is desirable when equality comparison is done to ensure two objects sharing equal field values
 * the pass the equality test stringify(object1) === stringify(object2)
*/
export function getSortedObject(pObject) {

  const paths = getPaths(pObject);
  paths.sort();
  const sortedObject = {};

  for (let index in paths) {
      const path = paths[index];
      const value = loDash.get(pObject, path);
      loDash.set(sortedObject, path, value);
  } // for (index in paths) {
  return sortedObject;
} // function getSortedObject(pObject) {

export function timeStampYyyyMmDd(dateObj) {
    // Convert the date to string form yyyy-mm-dd
    let year = dateObj.getFullYear();
    let month = dateObj.getMonth() + 1;
    month = addLeadingZeros(month, 2);
    let day = dateObj.getDate();
    day = addLeadingZeros(day, 2);
    return `${year}-${month}-${day}`;
} // export function timeStampYYYYMMDd(dateObj) { 

/** Convert a string to the form yyyy-mm-ddThh:mm:ss.ccc , e.g. '2024-02-25T15:00:25.251' */
export function timeStampString(dateObj) {
    let hours = addLeadingZeros(dateObj.getHours(), 2);
    let minutes = addLeadingZeros(dateObj.getMinutes(), 2);
    let seconds = addLeadingZeros(dateObj.getSeconds(), 2);
    let milliSec = addLeadingZeros(dateObj.getMilliseconds(), 3);
    return `${timeStampYyyyMmDd(dateObj)}T${hours}:${minutes}:${seconds}.${milliSec}`;
} // export function timeStampString(dateObj) {


/** Return a numeric string with trailing zeros.
 * E.g. addLeadingZeros(9, 3) = '009'
 * Inputs: 
 * aNumber - an integer or integer string.
 * newLength - the new length of the resulting string.
 */
export function addLeadingZeros(aNumber, newLength) {
  
    let newString = aNumber + '';
    const howManyZeros = newLength - newString.length;
    for (let count = 1; count <= howManyZeros; count++)
        newString = '0' + newString;

    return newString;
} // function addLeadingZeros(aString, newLength) {

/**Return a deep clone of a document object.
 * By using deep cloning, you create a new object that is entirely separate from the original state.
 * So that whatever you do to that clone, such as deletion of fields, does not affect the state.
 * NB. Class instance types will be converted to ordinary object types due to stringification.
 * */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
} // export function deepClone(obj) { // Return a deep clone of an object.

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

/**Convert numeric input to ZAR currency format string. */
const zarCurrencyFormat = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'ZAR'});
export function toZarCurrencyFormat(number) {
   return zarCurrencyFormat.format(number).replace(/ZAR/gi, 'R');
}

/**Binary Search the sorted primitive data array for a value and return the index.
 * ArraySortDir specifies the direction in which the array is sorted (desc or asc).
 * If the array contains the value searched for, then the index returned is the location of this value on the array,
 * otherwise, the index is of closest value in the array that is before or after the search value in terms of sort order.
 * Return -1 for an empty array.
 */
export function binarySearch(anArray, searchVal, startFrom = 0, arraySortDir = 'asc') {

    const sortDirections = ['asc', 'desc']
    if (!['asc', 'desc'].includes(arraySortDir))
        throw new Error(`arraySortDir must be one of ${sortDirections}`);

    if (anArray.length === 0)
        return -1; // Empty array.

    let start = 0,
        end = anArray.length - 1;

    while(start < end) {
        if (compare(anArray[start], searchVal) === 0)
            return start;
        else if (compare(anArray[end], searchVal) === 0)
            return end;

        const mid = Math.trunc((start + end) / 2);
        const comparison = compare(anArray[mid], searchVal, arraySortDir);
        if (comparison < 0)
            start = mid + 1;
        else if (comparison > 0)
            end = mid - 1;
        else
            return mid;
    } // while(start < end) {

    return start;
} // function binarySearch(anArray, arraySortDir, searchVal) {

/** Compare two values of the same primitive type, according to the sort direction.
*/
export function compare(value1, value2, sortDir = 'asc') {
    if (!['asc', 'desc'].includes(sortDir))
        throw new Error(`sortDir must be one of ${sortDir}`);

    const returnValue = (sortDir === 'desc'? -1 : 1);
    if (value1 > value2)
        return returnValue;
    else if (value1 < value2)
        return -returnValue;
    else // Avoid if (value1 === value2) because this may yield false for reference types (ie. Dates), because of different memory addresses.
        return 0;
} // export function compare(value1, value2, sortDir) {

/**Binary Search the sorted (ascending or descending order) array of objects for a value and return the index.
 * The assumption is that the array is sorted in order of 1 or more sort fields,
 * for example'lastName asc', 'firstName', 'address.province asc', 'address.townOrCity asc'.
 * If the array contains the object with values searched for, then the index returned is the location of this value in the array,
 * otherwise, the index is of the closest value in the array that is before or after the searchObj value.
 * Return -1 for an empty array.
 * Assumed field data types are Number, String and Date.
 */
export function binarySearchObj(objArray, searchObj, startFrom, ...sortFields) {
    if (objArray.length === 0)
        return -1;

    let start = startFrom,
        end = objArray.length - 1;

    while(start < end) {
        if (objCompare(objArray[start], searchObj, ...sortFields) === 0)
            return start;
        else if (objCompare(objArray[end], searchObj, ...sortFields) === 0)
            return end;

        let mid = Math.trunc((start + end) / 2);

        if (objCompare(objArray[mid], searchObj, ...sortFields) < 0)
            start = mid + 1;
        else if (objCompare(objArray[mid], searchObj, ...sortFields) > 0)
            end = mid - 1;
        else
            return mid;
    } // while(start < end) {
    
    return start;
} // export function binarySearchObj(objArray, searchObj, ...comparisonFields) {

/**Create an array with duplicates eliminated. Taking only the first or last object from each duplicate set.
 * If firstOfDuplicates === true, then the first element in each set of duplicates is taken.
 * if firstOfDuplicates === false, then the last element is taken from each set of duplicates.
 * Assumed field data types are Number, String and Date.
 */
export function getObjArrayWithNoDuplicates(objArray, firstOfDuplicates, ...comparisonFields) {
    function getNextSearchObj(pNext) {
        const nextObj = {...objArray[next]};
        let lastField;
        if (comparisonFields.length > 0)
            lastField = comparisonFields[comparisonFields.length - 1].split(' ');
        else
            throw new Error('Supply atleast 1 comparisonFields parameter.');

        const lastFieldName = lastField[0];
        const sortDir = lastField.length > 1? lastField[1] : 'asc';
        const lastFieldValue = loDash.get(nextObj, lastFieldName);

        if (typeof lastFieldValue === 'number') {
            if (sortDir === 'asc')
                loDash.set(nextObj, lastFieldName, 1e-10 + lastFieldValue);
            else
                loDash.set(nextObj, lastFieldName, -1e-10 + lastFieldValue);
        }
        else if (typeof lastFieldValue === 'string') { // instance of String
            if (sortDir === 'asc')
                loDash.set(nextObj, lastFieldName, lastFieldValue + ' ');
            else
                loDash.set(nextObj, lastFieldName, ' ' + lastFieldValue);
        }
        else if (lastFieldValue instanceof Date) {
            if (sortDir === 'asc')
                loDash.set(nextObj, lastFieldName, new Date(1 + lastFieldValue.getTime()));
            else
                loDash.set(nextObj, lastFieldName, new Date(-1 + lastFieldValue.getTime()));
        }
        else
            throw new Error(`${lastFieldName} must be type Number, String or Date`);

        return nextObj;
    } // function getNextSearchObj(pNext)

    if (objArray.length <= 1)
        return [...objArray];

    if (![true, false].includes(firstOfDuplicates))
        throw new Error(`firstOfDuplicates must be one of ${[true, false]}`);

    const noDuplicates = [];

    let next = 0;
    let nextSearchObj;
    if ((firstOfDuplicates)) {
        noDuplicates.push(objArray[next]);
    }        
    nextSearchObj = getNextSearchObj(objArray[next]);

    while (next < objArray.length) {
        // The aim is to jump to the next element that is not a duplicate of objArray[next].
        next = binarySearchObj(objArray, nextSearchObj, next, ...comparisonFields);
        let comparison = objCompare(objArray[next], nextSearchObj, ...comparisonFields);
        if (comparison < 0) {
            if (firstOfDuplicates) {
                next++;
                if  (next < objArray.length) {
                    noDuplicates.push(objArray[next]);
                    nextSearchObj = getNextSearchObj(objArray[next]);
                }
            }
            else  {
                noDuplicates.push(objArray[next]);
                next++;
                if (next < objArray.length)
                    nextSearchObj = getNextSearchObj(objArray[next]);
            }
            continue;
        }
        else {
            if (!firstOfDuplicates) {
                noDuplicates.push(objArray[next]);
            }
            else {
                noDuplicates.push(objArray[next]);
            }
        }
        
        nextSearchObj = getNextSearchObj(objArray[next]);
        next++;
    } // while (comparison !== 0 && next < objArray.length) {

    return noDuplicates;
} // export function getObjArrayWithNoDuplicates(objArray, ...comparisonFields) {

/**Compare 2 objects according to the comparison fields specified in the comparison fields, and return the result.
 * Each each of the comparisonFields must be of the form 'fieldName sortDirection' or 'fieldName'. 
 * Sort directions: 'asc', 'desc'.
 * Examples: 'lastName desc', 'firstName', 'firstName asc', 'address.provinceName asc'.
 * If sort direction is not provided, then it is assumed to be ascending.
*/
export function objCompare(obj1, obj2, ...comparisonFields) {
    if (comparisonFields.length === 0)
        throw new Error('comparisonFields not supplied!');

    const sortDirections = ['', 'asc', 'desc'];
    for (const index in comparisonFields) {
        const field = comparisonFields[index].split(' ');
        const fieldName = field[0];
        let sortDir = '';
        if (field.length === 2)
            sortDir = field[1];

        if (!sortDirections.includes(sortDir))
            throw new Error('Sort direction must be one of ' + sortDirections.toString());

        const value1 = loDash.get(obj1, fieldName);
        const value2 = loDash.get(obj2, fieldName);

        const returnValue = (sortDir === 'desc'? -1: 1);
        if (value1 > value2)
            return returnValue;
        else if (value1 < value2)
            return -returnValue;
    } // for (const field in comparisonFields) {
    return 0;
} // function comparison(obj1, obj2, ...comparisonFields) {

/**
 * Determine whether an object contains only 1 or more of the specified fields, and not any other fields.
 * @param {*} anObject a Javascript object.
 * @param  {...string} fields one or more field names.
 * @returns boolean.
 */
export function hasOnly(anObject, ...fields) {
    if (!fields || !fields.length)
        throw new Error('fields must be specified');

    const paths = getPaths(anObject);
    for (const index in paths) {
        const path = paths[index];

        if (!fields.includes(path))
            return false;
    } // for (const index in paths)

    return true;
}

/**
 * Determine whether an object contains all of the specified fields.
 * @param {*} anObject a Javascript object.
 * @param  {...string} fields one or field names.
 * @returns boolean.
 */
export function hasAll(anObject, ...fields) {
    if (!fields || !fields.length)
        throw new Error('fields must be specified');

    const paths = getPaths(anObject);
    let count = 0;
    for (const index in fields) {
        const field = fields[index];

        if (!paths.includes(field))
            return false;
        else
            count++;
    } // for (const index in paths)

    return (count === fields.length);
}