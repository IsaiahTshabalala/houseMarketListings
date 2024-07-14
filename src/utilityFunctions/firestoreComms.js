/**File: firestoreComms.js
 * Description: Functions that help with querying Firestore data.
 * 
 * Date         Dev  Version  Description
 * 2024/01/21   ITA  1.00     Genesis.
 * 2024/05/16   ITA  1.01     Add more variables.
 * 2024/06/22   ITA  1.02     Move function descriptions to the top, outside of each respective function, so as to be displayed on the documentation tips.
 *                            Rename QueryTypes to FetchTypes.
 *                            Improve the getListingsQueryObject, getListingsByUserIdQueryObject and getListingsPerMainPlaceQueryObject
 *                            to create a query fetching data after a specified document, or up to a specified document.
 * 2024/07/14   ITA   1.03    getListingsByUserIdQueryObject: fix a bug. When the FetchType is END_AT_DOC, the query must use endAt, not startAfter.
 *                            Add priceRanges and PRICE_RANGES, to be usable with dropdowns, to enable users to select the price range of properties sought.
 */
import { collection, collectionGroup, getDocs, getDoc, doc, query, where, 
         or, and, orderBy, limit, startAfter, endAt, getAggregateFromServer, count, 
         Timestamp} from 'firebase/firestore';
import { db } from '../config/appConfig.js';
import { getSortedObject, toZarCurrencyFormat } from './commonFunctions.js';

export const PROVINCES = 'provinces',
             MUNICIPALITIES = 'municipalities',
             MAIN_PLACES = 'mainPlaces',
             SUB_PLACES = 'subPlaces',
             TRANSACTION_TYPES = 'transactionTypes',
             PROPERTY_TYPES = 'propertyTypes',
             NUMBER_OF_BEDROOMS = 'numberOfBedrooms',
             PRICE_FROM = 'priceFrom',
             PRICE_TO = 'priceTo',
             PRICE_RANGES = 'priceRanges',
             LISTINGS = 'listings',
             CLICKED_LISTING = 'clickedListing',
             GET_LISTINGS_QUERY_OBJECT = 'getListingsQueryObject',
             QUERY_TIME = 'queryTime',
             REPORTS = 'reports';

export const propertyTypes = ['House', 'Apartment/Flat', 'Town House', 'Room', 'Vacant Land'],
             transactionTypes = ['Rent', 'Sale'],
             numberOfBedrooms = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export const FetchTypes = Object.freeze({
    END_AT_DOC: 'END_AT_DOC', // Query data before the specified document
    START_AFTER_DOC: 'START_AFTER_DOC' // Query data after a specified document.
});

export const NUMBER_OF_DOCS = 'numberOfDocuments', // The current number of documents that are being listened to.
             LAST_DOC = 'lastDocument'; // The last document that was retrieved from Firestore.

/**
 * Convert an array of prices into price ranges.
 */
function getRanges(pricesArray) {
    const ranges = [];

    for (let index = 0; index < pricesArray.length; index++) {
        let range = toZarCurrencyFormat(pricesArray[index]);
        if (index + 1 < pricesArray.length) {
            range += ' to ' + toZarCurrencyFormat(pricesArray[index + 1]);
        }
        else
            range += ' +';
        
        ranges.push(range);
    }
    return ranges;
} // function getRanges(priceArray) {

export const rentalPriceRanges = getRanges([500, 1000, 2000, 3000, 5000, 7000, 9000, 12000, 15000, 30000, 50000]);
export const salesPriceRanges = getRanges([100000, 200000, 400000, 600000, 800000, 1000000, 1500000, 2500000, 
                                            4000000, 7500000, 10000000]);

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

/** Build and return a query object based on the supplied parameters. */
export function getListingsQueryObject(mainPlaces, transactionTypes, 
                                        propertyTypes, numberOfBedrooms, offersOnly = false, 
                                        numDocs = null, snapshotDoc = null, fetchType = null) {

    let collectionRef = null;
    collectionRef = collection(db, '/listings');
    const addressConstraints = [];

    if (![null, FetchTypes.END_AT_DOC, FetchTypes.START_AFTER_DOC].includes(fetchType))
        throw(new Error(`fetchType must be one of ${FetchTypes.toString()}`));

    if (snapshotDoc === null && fetchType !== null) // A doc must be specified for non-null fetchType
        throw new Error(`fetchType is ${fetchType}, but the document is null.`);

    if (fetchType === null && numDocs === null)
        throw new Error('numDocs must be specified.');

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
        moreConstraints.push(where('priceInfo.offer.expiryDate', '>=', Timestamp.now()));
    } // if (offersOnly) {

    moreConstraints.push(where('flagged', '==', false));
    const moreConstraints2 = [];
    if (numDocs !== null)
        moreConstraints2.push(limit(numDocs));

    if (snapshotDoc !== null) {
        if (fetchType === FetchTypes.START_AFTER_DOC)
            moreConstraints2.push(startAfter(snapshotDoc));
        else if (fetchType === FetchTypes.END_AT_DOC) // Typically for creating listeners.
            moreConstraints2.push(endAt(snapshotDoc));
    } // if (snapshotDoc !== null) {

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

/** Return a query object for querying for listings of a single user, sorted in descending order of creation date.
*/
export function getListingsByUserIdQueryObject(userId, numDocs = null, snapshotDoc = null, fetchType = null) {

    let collectionRef = collection(db, '/listings');
    if (![null, FetchTypes.END_AT_DOC, FetchTypes.START_AFTER_DOC].includes(fetchType))
        throw(new Error(`fetchType must be one of ${FetchTypes.toString()}.`));

    if (snapshotDoc === null && fetchType !== null) // A doc must be specified for non-null fetchType
        throw new Error(`fetchType is ${fetchType}, but the document is null.`);
    
    if (fetchType === null && numDocs === null)
        throw new Error('numDocs must be specified.');

    const constraints = [ 
                            where('userId', '==', userId),
                            where('flagged', '==', false),
                            orderBy('dateCreated', 'desc')
                        ];

    if (numDocs !== null)
        constraints.push(limit(numDocs));

    if (snapshotDoc !== null) {
        if (fetchType === FetchTypes.START_AFTER_DOC)
            constraints.push(startAfter(snapshotDoc));
        else if (fetchType === FetchTypes.END_AT_DOC)
            constraints.push(endAt(snapshotDoc));
    }

    const myQuery = query(
                        collectionRef, 
                        ...constraints
                    );
    return myQuery;
} // function getListingsByUserIdQueryObject() {

/** Get the total number of listings for a province. */
export async function getListingCountPerProvince(provincialCode) {

    const collectionRef = collection(db, '/listings');
    const constraints = [
                            where('address.provincialCode', '==', provincialCode),
                            where('flagged', '==', false)
                        ];

    const myQuery = query(collectionRef, ...constraints);
    const snapshot = await getAggregateFromServer(myQuery, {
                                countOfDocs: count()
                            });
    return snapshot.data().countOfDocs;
} // export async function getListingCountProvince(provincialCode)

    /** Get the total number of listings for a municipality. */
export async function getListingCountPerMunicipality(provincialCode, municipalityCode) {

    const collectionRef = collection(db, '/listings');
    const constraints = [
                            where('address.provincialCode', '==', provincialCode),
                            where('address.municipalityCode', '==', municipalityCode),
                            where('flagged', '==', false)
                        ];

    const myQuery = query(collectionRef, ...constraints);
    const snapshot = await getAggregateFromServer(myQuery, {
                                countOfDocs: count()
                            });
    return snapshot.data().countOfDocs;
} // export async function getListingCountPerMunicipality(provincialCode, municipalityCode)

/** Get the total number of listings for a main place. */
export async function getListingCountPerMainPlace(provincialCode, municipalityCode, mainPlaceCode) {

    const collectionRef = collection(db, '/listings');
    const constraints = [
                            where('address.provincialCode', '==', provincialCode),
                            where('address.municipalityCode', '==', municipalityCode),
                            where('address.mainPlaceCode', '==', mainPlaceCode),
                            where('flagged', '==', false)
                        ];

    const myQuery = query(collectionRef, ...constraints);
    const snapshot = await getAggregateFromServer(myQuery, {
                                countOfDocs: count()
                            });
    return snapshot.data().countOfDocs;
} // export async function getListingCountPerMainPlace(provincialCode, municipalityCode, mainPlaceCode)


/**Return a query object to be used for querying listings in a mainPlace. */
export function getListingsPerMainPlaceQueryObject(provincialCode, municipalityCode, mainPlaceCode,
                                                    numDocs = null, snapshotDoc = null, fetchType = null) {
    
    if (![null, FetchTypes.END_AT_DOC, FetchTypes.START_AFTER_DOC].includes(fetchType))
        throw(new Error(`fetchType must be one of ${FetchTypes.toString()}`));

    if (snapshotDoc === null && fetchType !== null) // A doc must be specified for non-null fetchType
        throw new Error(`fetchType is ${fetchType}, but the document is null.`);

    if (fetchType === null && numDocs === null)
        throw new Error('numDocs must be specified.');

    const collectionRef = collection(db, '/listings');
    const constraints = [
                            where('address.provincialCode', '==', provincialCode),
                            where('address.municipalityCode', '==', municipalityCode),
                            where('address.mainPlaceCode', '==', mainPlaceCode),
                            where('flagged', '==', false)
                        ];    

    if (numDocs !== null)
        constraints.push(limit(numDocs));

    if (snapshotDoc !== null) {
        if (fetchType === FetchTypes.START_AFTER_DOC)
            constraints.push(startAfter(snapshotDoc));
        else if (fetchType === FetchTypes.END_AT_DOC)
            constraints.push(endAt(snapshotDoc)); // Typically for listeners.
    } // if (snapshotDoc !== null) {
    
    return query(collectionRef, ...constraints);
} // export function getListingsPerMainPlaceQueryObject()

/**Return a query object to be used for querying reports (complaints) on listings */
export function getReportsToReviewQuery(numDocs = null, snapshotDoc = null, fetchType = null) {
    if (![null, FetchTypes.END_AT_DOC, FetchTypes.START_AFTER_DOC].includes(fetchType))
        throw(new Error(`fetchType must be one of ${FetchTypes.toString()}`));

    if (snapshotDoc === null && fetchType !== null) // A doc must be specified for non-null fetchType
        throw new Error(`fetchType is ${fetchType}, but the snapshotDoc is null.`);

    const collectionRef = collectionGroup(db, 'reports');
    const constraints = [where('reviewed', '==', false)];
    constraints.push(orderBy('listingId'));
    if (numDocs !== null)
        constraints.push(limit(numDocs));

    if (snapshotDoc !== null) {
        if (fetchType === FetchTypes.START_AFTER_DOC)
            constraints.push(startAfter(snapshotDoc));
        else if (fetchType === FetchTypes.END_AT_DOC)
            constraints.push(endAt(snapshotDoc)); // Typically used for listeners.
    } // if (snapshotDoc !== null) {

    return query(collectionRef, ...constraints);
} // export function getReportsToReviewQuery() {

export function getAllProvinces() {
    const path = PROVINCES;
    return getCollectionDocs(path);
} // export function getAllProvinces() {

/** Return an array of municipality documents of a province. {code, name} */
export function getMunicipalitiesPerProvince(provincialCode) {
    
    const path = `${PROVINCES}/${provincialCode}/${MUNICIPALITIES}`;
    return getCollectionDocs(path);
} // export function getMunicipalitiesPerProvince(provincialCode) {

/** Get all the municipalities of the respective provinces. In the form {provincialCode, code, name}.
 * code and name are the municipality code and name respectively.
 * Return a promise that resolves when any or all of the municipalities have been obtained.
 */
export async function getMunicipalitiesOfTheProvinces(provincialCodes) {
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

/** Get all the main place documents of this municipality in this province. {code, name} */
export function getMainPlacesPerMunicipality(provincialCode, municipalityCode) {
    const path = `${PROVINCES}/${provincialCode}/${MUNICIPALITIES}/${municipalityCode}/${MAIN_PLACES}`;
    return getCollectionDocs(path);
} // export function getMainPlacesPerMunicipality(provincialCode, municipalityCode) {

/** Get all the mainPlaces of the respective municipalities.
 * Each municipality object must be of the form {provincialCode, municipalityCode, code, name},
 * where code is the main place code and name is the main place name.
 */
export async function getMainPlacesOfTheMunicipalities(municipalityObjects) {
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

/** Get all the sub-places of this main place of this municipality of this province. */
export function getSubPlacesPerMainPlace(provincialCode, municipalityCode, mainPlaceCode) {
    const path = `${PROVINCES}/${provincialCode}/${MUNICIPALITIES}/${municipalityCode}/${MAIN_PLACES}/${mainPlaceCode}/${SUB_PLACES}`;
    return getCollectionDocs(path);
} // export function getMainPlacesPerMunicipality(provincialCode, municipalityCode, mainPlaceCode) {

/**Get the sub-places of the main-place in the form {provincialCode, municipalityCode, mainPlaceCode, code, name}*/
export async function getSubPlacesOfTheMainPlaces(mainPlaceObjects) {
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
