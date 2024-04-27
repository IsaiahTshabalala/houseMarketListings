/**File: firestoreComms.js
 * Description: Functions that help with querying Firestore data.
 */
import { collection, getDocs, getDoc, doc, query, where, 
         or, and, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from '../config/appConfig.js';
import { getSortedObject } from './commonFunctions.js';

export const PROVINCES = 'provinces',
             MUNICIPALITIES = 'municipalities',
             MAIN_PLACES = 'mainPlaces',
             SUB_PLACES = 'subPlaces',
             TRANSACTION_TYPES = 'transactionTypes',
             PROPERTY_TYPES = 'propertyTypes',
             NUMBER_OF_BEDROOMS = 'numberOfBedrooms',
             PRICE_FROM = 'priceFrom',
             PRICE_TO = 'priceTo',
             LISTINGS = 'listings',
             CLICKED_LISTING = 'clickedListing',
             GET_LISTINGS_QUERY_OBJECT = 'getListingsQueryObject',
             QUERY_TIME = 'queryTime';

export const propertyTypes = ['House', 'Apartment/Flat', 'Town House', 'Room', 'Vacant Land'],
             transactionTypes = ['Rent', 'Sale'],
             numberOfBedrooms = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export async function getCollectionDocs(path, withIds = false) {
    const collectionRef = collection(db, path);
    let data = [];
    let theError = null;
    await getDocs(collectionRef)
            .then(snapshot=> {
                const docs = snapshot.docs.map(snapshotDoc=> {
                    const myObject = snapshotDoc.data();

                    if (withIds)
                        myObject.id = snapshotDoc.id;

                    return myObject;
                });
                data = docs;
            })  
            .catch(error=> {
                console.log(error);
                theError = error;
            }); // END of await getDocs(collectionRef)
    if (theError === null)
        return Promise.resolve(data);

    return Promise.reject(theError);

} // export function getCollectionDocs(path) {

export async function getUser(userId) {
    /** Get the user with the specified userId.    
        {
            displayName,
            firstName,
            surname,
            dateOfBirth,
            mobileNo,
            email,
            address: {
                complexName,
                unitNo,
                streetNo,
                streetName,
                provincialCode,
                municipalityCode,
                mainPlaceCode,
                subPlaceCode
            }
        }
     */
    try {
        const path = `/users/${userId}`;
        const docSnap = await getDocumentSnapshot(path);
        if (docSnap !== null) {
            let data = docSnap.data().personalDetails;
            let dob = data.dateOfBirth.toDate(); // Firestore Timestamp date converted to Javascript date.
            data.dateOfBirth = dob;
            return Promise.resolve(data);
        } // if (docSnap !== null) {
    } catch (error) {
        console.log(error);
        return Promise.reject(error);
    } // catch (error) {
    return Promise.resolve(null);
} // export async function getUser(userId) {

export async function getDocumentSnapshot(path) {
    try {
        const docRef = doc(db, path);
        const docSnap = await getDoc(docRef);
        if (docSnap !== null && docSnap.exists()) {
            return Promise.resolve(docSnap);
        } // if (docSnap !== null && docSnap.exists()) {
    } catch (error) {
        console.log(error);
        return Promise.reject(error);
    } // catch (error) {
    return Promise.resolve(null);
} // export async function getDocumentSnapshot(path) {

export async function getDocument(path, withId = false) {
    try {
        const docSnap = await getDocumentSnapshot(path);
        if (docSnap !== null) {
            let data = docSnap.data();
            if (withId === true)
                data.id = docSnap.id;

            return Promise.resolve(data);
        } // if (docSnap !== null && docSnap.exists()) {
    } catch (error) {
        console.log(error);
        return Promise.reject(error);
    } // catch (error) {
    return Promise.resolve(null);
} // export async function getDocument(path) {

export function getProvince(provincialCode) {
    /** Get the province with the specified provincial code.    
        {
            code,
            name
        }
     */    
    const path = `${PROVINCES}/${provincialCode}`;
    return getDocument(path);
} // export function getProvince(provincialCode) {

export function getMunicipality(provincialCode, municipalityCode) {
    /** Get the municipality with the specified provincial and municipality codes.
        {
            code,
            name
        }
     */
    const path = `${PROVINCES}/${provincialCode}/${MUNICIPALITIES}/${municipalityCode}`;
    return getDocument(path);
} // export function getMunicipality(provincialCode, municipalityCode) {

export function getMainPlace(provincialCode, municipalityCode, mainPlaceCode) {
    /** Get the main place.
        {
            code,
            name
        }
     */
    const path = `${PROVINCES}/${provincialCode}/${MUNICIPALITIES}/${municipalityCode}/${MAIN_PLACES}/${mainPlaceCode}`;
    return getDocument(path);
} // export function getMainPlace(provincialCode, municipalityCode, mainPlaceCode) {


export function getSubPlace(provincialCode, municipalityCode, mainPlaceCode, subPlaceCode) {
    /** Get the main place.
        {
            code,
            name
        }
     */
    const path = `${PROVINCES}/${provincialCode}/${MUNICIPALITIES}/${municipalityCode}/${MAIN_PLACES}/${mainPlaceCode}/`
                    + `${SUB_PLACES}/${subPlaceCode}`;
    return getDocument(path);
} // export function getMunicipality(provincialCode, municipalityCode) {

export function getListingsQueryObject(mainPlaces, transactionTypes, 
                                        propertyTypes, numberOfBedrooms, offersOnly = false, 
                                        numDocs = null, startAfterDoc = null) {
    /* Build and return a query object based on the supplied parameters. */
    let collectionRef = null;
    try {
        collectionRef = collection(db, '/listings');
    } catch (error) {
        return Promise.reject(error);
    }

    const addressConstraints = [];
    mainPlaces.forEach(mainPlace=> {
        const constr = and(
                            where('address.provincialCode', '==', mainPlace.provincialCode),
                            where('address.municipalityCode', '==', mainPlace.municipalityCode),
                            where('address.mainPlaceCode', '==', mainPlace.code),
                        );
        addressConstraints.push(constr);
    });

    const moreConstraints = [
        where('transactionType', 'in', transactionTypes),
        where('propertyType', 'in', propertyTypes),
        where('numBedrooms', 'in', numberOfBedrooms)
    ];
    if (offersOnly) {
        moreConstraints.push(where('priceInfo.offer', '!=', null));
    } // if (offersOnly) {

    moreConstraints.push(where('flagged', '==', false));
    const moreConstraints2 = [];
    if (numDocs !== null)
        moreConstraints2.push(limit(numDocs));

    if (startAfterDoc !== null)
        moreConstraints2.push(startAfter(startAfterDoc));    

    const myQuery = query(
                        collectionRef,
                        and(
                            or(...addressConstraints),
                            ...moreConstraints
                        ),
                        ...moreConstraints2
                    );
    return myQuery;
} // function getListingsQueryObject() {

export function getListingsByUserIdQueryObject(userId, numDocs = null, startAfterDoc = null) {
    /** Return a query object for querying for listings of a single user, sorted in descending order of creation date.
    */
    let collectionRef = null;
    try {
        collectionRef = collection(db, '/listings');
    } catch (error) {
        return Promise.reject(error);
    }

    const constraints = [ 
                            where('userId', '==', userId),
                            where('flagged', '==', false),
                            orderBy('dateCreated', 'desc')
                        ];

    if (numDocs !== null)
        constraints.push(limit(numDocs));
    if (startAfterDoc !== null)
        constraints.push(startAfter(startAfterDoc));

    const myQuery = query(
                        collectionRef, 
                        ...constraints
                    );
    return myQuery;
} // function getListingsByUserIdQueryObject() {

export function getAllProvinces() {
    const path = PROVINCES;
    return getCollectionDocs(path);
} // export function getAllProvinces() {

export function getMunicipalitiesPerProvince(provincialCode) {
    // Return an array of municipality documents of this province. {code, name}
    const path = `${PROVINCES}/${provincialCode}/${MUNICIPALITIES}`;
    return getCollectionDocs(path);
} // export function getMunicipalitiesPerProvince(provincialCode) {

export async function getMunicipalitiesOfTheProvinces(provincialCodes) {
// Get all the municipalities of the respective provinces. In the form {provincialCode, code, name}.
// code and name are the municipality code and name respectively.
// Return a promise that resolves when all the municipalities have been obtained, otherwise return a rejected promise.
    const promises = provincialCodes.map(provincialCode=> {
        return getMunicipalitiesPerProvince(provincialCode);
    });

    const outcomes = [];
    for (const idx in provincialCodes) {
        await promises[idx]
                .then(result=> {
                    const municipalities = result.map(doc=> {
                        return getSortedObject({...doc, 
                                    provincialCode: provincialCodes[idx]
                                });
                    });
                    outcomes.push(Promise.resolve(municipalities));
                })
                .catch(error=> {
                    outcomes.push(Promise.reject({error, provincialCode: provincialCodes[idx]}));
                });
    } // for (const idx in provincialCodes) {

    return Promise.allSettled(outcomes);
} // export async function getMunicipalitiesOfTheProvinces(provincialCodes) {

export function getMainPlacesPerMunicipality(provincialCode, municipalityCode) {
    // Get all the main place documents of this municipality in this province. {code, name}
    const path = `${PROVINCES}/${provincialCode}/${MUNICIPALITIES}/${municipalityCode}/${MAIN_PLACES}`;
    return getCollectionDocs(path);
} // export function getMainPlacesPerMunicipality(provincialCode, municipalityCode) {

export async function getMainPlacesOfTheMunicipalities(municipalityObjects) { 
    // Get all the mainPlaces of the respective municipalities.
    // Each municipality object must be of the form {provincialCode, municipalityCode, code, name}, where code is the municipality code
    const promises = municipalityObjects.map(municipality=> {
        return getMainPlacesPerMunicipality(municipality.provincialCode, municipality.code);
    });

    const outcomes = [];
    for (const idx in municipalityObjects) {
        await promises[idx]
                .then(result=> {
                    const {provincialCode, code: municipalityCode} = municipalityObjects[idx];
                    const mainPlaces = result.map(doc=> {
                        return getSortedObject({
                                    ...doc,
                                    provincialCode,
                                    municipalityCode
                                });
                    });
                    outcomes.push(Promise.resolve(mainPlaces));
                })
                .catch(error=> outcomes.push(error));
    } // for (const idx in municipalityObjects) {
    
    return Promise.allSettled(outcomes);
} // export function getAllMainPlacesOfTheMunicipality(params) {

export function getSubPlacesPerMainPlace(provincialCode, municipalityCode, mainPlaceCode) {
    // Get all the sub-places of this main place of this municipality of this province. {code, name}
    const path = `${PROVINCES}/${provincialCode}/${MUNICIPALITIES}/${municipalityCode}/${MAIN_PLACES}/${mainPlaceCode}/${SUB_PLACES}`;
    return getCollectionDocs(path);
} // export function getMainPlacesPerMunicipality(provincialCode, municipalityCode, mainPlaceCode) {

export async function getSubPlacesOfTheMainPlaces(mainPlaceObjects) {
    /**Get the sub-places of the main-place in the form {provincialCode, municipalityCode, mainPlaceCode, code, name}*/
    const promises = mainPlaceObjects.map(mainPlace=> {
        return getSubPlacesPerMainPlace(mainPlace.provincialCode, mainPlace.municipalityCode, mainPlace.code);
    });
    const outcomes = [];

    for (const idx in mainPlaceObjects) {
        await promises[idx]
                .then(results=> {
                    const {provincialCode, municipalityCode, code: mainPlaceCode} = mainPlaceObjects[idx];
                    const subPlaces = results.map(doc=> {
                        return getSortedObject({
                                    ...doc,
                                    provincialCode,
                                    municipalityCode,
                                    mainPlaceCode
                                });
                    });
                    outcomes.push(Promise.resolve(subPlaces));
                })
                .catch(error=> {
                    outcomes.push(Promise.reject(error));
                });
    } // for (const idx in mainPlaceObjects) {
    
    return Promise.allSettled(outcomes);
} // export async function getSubPlacesOfTheMainPlaces(mainPlaceObjects) {
