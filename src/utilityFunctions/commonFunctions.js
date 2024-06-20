/**
 * File: ./src/utilityFunctions/commonFunctions.js
 * -----------------------------------------------------------------------------
 * Description: provides functions for validation of fields.
 * NB. For front-end use only!! The regExes herein may expose an application to regEx attacks if used at backend.
 * -------------------------------------------------------------------------------------------------------------
 * Date        Dev   Version  Description
 * 2023/07/28  ITA   1.00     Genesis.
 * 2024/05/08  ITA   1.01     Rename function timeStampYyyyMmHh to timeStampYyyyMmDd.
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
  return isValidDecimalNumber 
          && Number.parseFloat(value) > 0;
} // export function isPositiveDecimalNumber(value) {

export function isValidZeroOrGreaterDecimalNumber(value) {
  return isValidDecimalNumber(value) 
         && Number.parseFloat(value) >= 0
} // export function isZeroOrGreaterDecimalNumber(value) {

export function hasValues(variable) {
/** Check whether a variable has values at all. To be used only on Object, Array and Primitive types.
 * The following variables are considered to have no values:
 * 1. Empty arrays.
 * 1. Objects with only undefined or null values.
 * 2. Primitive types with undefined or null values.
*/
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

export function getPaths(anObject) {
  // Get all the field paths in ascending order, including the nested ones, that an object has.
  /* Example, when called on the object 
              {
                  description: 'Chair',
                  priceInfo: {
                      regularPrice: 200,
                      discountedPrice: 100
                  }
              }
    getPaths(anObject) will return an array ['description', 'priceInfo.discountedPrice', 'priceInfo.regularPrice']
  */
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
  return paths.toSorted();
} // export function getPaths()

export function getSortedObject(pObject) {
  /* Return an object with sorted fields, by order of name. 
     This is desireble when equality comparison is done to ensure two objects sharing equal field values
     the equality test stringify(object1) === stringify(object2)
  */
  const paths = getPaths(pObject);
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

export function timeStampString(dateObj) {
    // Convert a string to the form yyyy-mm-ddThh:mm:ss.ccc , e.g. '2024-02-25T15:00:25.251'
    let hours = addLeadingZeros(dateObj.getHours(), 2);
    let minutes = addLeadingZeros(dateObj.getMinutes(), 2);
    let seconds = addLeadingZeros(dateObj.getSeconds(), 2);
    let milliSec = addLeadingZeros(dateObj.getMilliseconds(), 3);
    return `${timeStampYyyyMmDd(dateObj)}T${hours}:${minutes}:${seconds}.${milliSec}`;
} // export function timeStampString(dateObj) {

export function addLeadingZeros(aNumber, newLength) {
    // Return a numeric string with trailing zeros.
    // E.g. addLeadingZeros(9, 3) = '009'
    // Input: aNumber - an integer or integer string.
    // Input: newLength - the new length of the resulting string.
  
    let newString = aNumber + '';
    const howManyZeros = newLength - newString.length;
    for (let count = 1; count <= howManyZeros; count++)
        newString = '0' + newString;

    return newString;
} // function addLeadingZeros(aString, newLength) {

export function deepClone(obj) { // Return a deep clone of an object.
    /**
     * By using deep cloning, you create a new object that is entirely separate from the original state.
     * So that whatever you do to that clone, such as deletion of fields, does not affect the state. */
    return JSON.parse(JSON.stringify(obj));
} // export function deepClone(obj) { // Return a deep clone of an object.

export function objectFromFile(fileInstance) {
  // Create a document object from a file instance.
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

export function getRandomChars(numChars = 1) {
  // Return a random string of alpha-numeric characters.
  const chars = '01234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (numChars < 1 || numChars > chars.length)
      throw new Error('Parameter numChars is out of bounds');
  let randomChars = '';
  for (let idx = 0; idx < numChars; idx++) {
      const randNum = Math.trunc(Math.random() * 10000000000) % chars.length; // A random number from 0 to chars.length - 1
      randomChars += chars[randNum];
  }
  return randomChars;
}

export function toZarCurrencyFormat(number) {
  return number.toLocaleString('en-ZA', {style: 'currency', currency: 'ZAR'});
}

export function diff(leftArray, rightArray) {
  // Return an array with elements in leftArray that are not in rightArray.
  const diffArray = [];
  leftArray.forEach(left=> {
      if (rightArray.findIndex(right=> right === left) < 0)
          diffArray.push(left);
  }); // leftArray.forEach() {
  return diffArray;
} // function diff(leftArray, rightArray) {

export function diffObjArray(leftArray, rightArray) {
  // Return an array with elements in leftArray that are not in rightArray.
  const diffArray = [];
  leftArray.forEach(left=> {
      if (rightArray.findIndex(right=> {
              return JSON.stringify(right) === JSON.stringify(left);
          }) < 0) {
          diffArray.push(left);
      }
  }); // leftArray.forEach() {
  return diffArray;     
} // export function diffObjArray(leftArray, rightArray) {