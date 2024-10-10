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
 * 2024/08/08   ITA   1.01    Move the function transformListingData to this file, so as to have one centralised instance, instead of same function existing across many components.
 * 2024/08/14   ITA   1.02    Order of field constraints in queries to match the order of fields in composite indexes.
 * 2024/09/04   ITA   1.03    In the transformListings function, handle instance where the province/municipality/main-place/sub-place of a listing is not available in the provinces collection. This will eliminate errors
 *                            and enable users to be able to view and update their listings. Assign place names such listings as 'Unknown Province', 'Unknown Municipality', etc.
 * 2024/09/18   ITA   1.04    All variable names moved to the VarNames object. Renamed getListingsQueryObject appropriately to getListingsByPlaceQueryObject and added validation for place objects.
 *                            Added a separate getAllListingsQueryObject function, for getting query for requesting all listings.
 *                            Added a new QueryNames enumeration constant, for specifying the nature of listings query to be performed.
 *                            Listing count functions no longer used, removed.
 *                            
 */
import { collection, collectionGroup, getDocs, getDoc, doc, query, where, 
         or, and, orderBy, limit, startAfter, endAt } from 'firebase/firestore';
import { db } from '../config/appConfig.js';
import { getSortedObject, toZarCurrencyFormat, hasAll } from './commonFunctions.js';

// For naming of context variables.
export const VarNames = Object.freeze({
    PROVINCES: 'provinces',
    MUNICIPALITIES: 'municipalities',
    MAIN_PLACES: 'mainPlaces',
    SUB_PLACES: 'subPlaces',
    TRANSACTION_TYPES: 'transactionTypes',
    PROPERTY_TYPES: 'propertyTypes',
    NUMBER_OF_BEDROOMS: 'numberOfBedrooms',
    PRICE_FROM: 'priceFrom',
    PRICE_TO: 'priceTo',
    PRICE_RANGES: 'priceRanges',
    LISTINGS: 'listings',
    CLICKED_LISTING: 'clickedListing',
    OFFERS_ONLY: 'offersOnly',
    GET_LISTINGS_QUERY_OBJECT: 'getListingsQueryObject',
    QUERY_NAME: 'queryName',
    REPORTS: 'reports',
    LISTINGS_KEY: 'listingsKey',
    NUMBER_OF_DOCS: 'numberOfDocuments', // The current number of documents that are being listened to.
    LAST_DOC: 'lastDocument', // The last document that was retrieved from Firestore.
    PAGE_NUM: 'pageNumber',
    REPORTS_TO_DISPLAY: 'reportsToDisplay',
    REPORTED_LISTINGS: 'reportedListings'
});

export const propertyTypes = ['House', 'Apartment/Flat', 'Town House', 'Room', 'Vacant Land'],
             transactionTypes = ['Rent', 'Sale'],
             numberOfBedrooms = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export const FetchTypes = Object.freeze({
    END_AT_DOC: 'END_AT_DOC', // Query data before the specified document
    START_AFTER_DOC: 'START_AFTER_DOC' // Query data after a specified document.
});

export const QueryNames = Object.freeze({
    ALL_LISTINGS: 'ALL_LISTINGS',
    MY_LISTINGS: 'MY_LISTINGS',
    FILTERED_LISTINGS: 'FILTERED_LISTINGS'
});

/**To a listing record:
 * Add fields such as provinceName, municipalityName, mainPlaceName, subPlaceName, 
 * and currentPrice. Also convert Timestamp dates to Javascript dates. */
export async function transformListingData(provinces, municipalities, mainPlaces, subPlaces, listingSnapshot) {
    const listing = listingSnapshot.data();
    listing.listingId = listingSnapshot.id;
                
    let province = provinces.find(prov=> {
        return prov.code === listing.address.provincialCode;
    });
    if (province === undefined) {
        province = await getProvince(listing.address.provincialCode);
        if (province)
            provinces.push(province);
    }
    listing.address.provinceName = province? province.name : 'Unknown Province';

    let municipality = municipalities.find(municipal=> {
        return municipal.provincialCode === listing.address.provincialCode
                && municipal.code === listing.address.municipalityCode;
    });
    if (municipality === undefined) {
        // Add the municipality to the listing belongs, if it does not exist.
        municipality = await getMunicipality(listing.address.provincialCode, 
                                                listing.address.municipalityCode);
        if (municipality) {
            municipality = {
                ...municipality,
                provincialCode: listing.address.provincialCode
            };
            municipalities = [...municipalities, municipality];            
        }
    }
    listing.address.municipalityName = municipality? municipality.name : 'Unknown Municipality';

    let mainPlace = mainPlaces.find(place=> {
        return place.provincialCode === listing.address.provincialCode
                && place.municipalityCode === listing.address.municipalityCode
                && place.code === listing.address.mainPlaceCode;
    });
    if (mainPlace === undefined) {
        mainPlace = await getMainPlace(listing.address.provincialCode, listing.address.municipalityCode, listing.address.mainPlaceCode);
        if (mainPlace) {
            mainPlace = {
                ...mainPlace,
                provincialCode: listing.address.provincialCode,
                municipalityCode: listing.address.municipalityCode
            };
            mainPlaces.push(mainPlace);
        }
    } // if (mainPlace === undefined) {
    listing.address.mainPlaceName = mainPlace? mainPlace.name : 'Unknown Main Place';

    let subPlace = subPlaces.find(place=> {
        return place.provincialCode === listing.address.provincialCode
                && place.municipalityCode === listing.address.municipalityCode
                && place.mainPlaceCode === listing.address.mainPlaceCode
                && place.code === listing.address.subPlaceCode;
    });
    if (subPlace === undefined) {
        subPlace = await getSubPlace(listing.address.provincialCode, listing.address.municipalityCode,
                                        listing.address.mainPlaceCode, listing.address.subPlaceCode);
        if (subPlace) {
            subPlace = {
                ...subPlace,
                provincialCode: listing.address.provincialCode,
                municipalityCode: listing.address.municipalityCode,
                mainPlaceCode: listing.address.mainPlaceCode
            };
            subPlaces.push(subPlace);
        }
    } // if (subPlace === undefined) {
    listing.address.subPlaceName = subPlace? subPlace.name : 'Unknown Sub-place';
    
    // Convert the Firestore Timestamp dates to Javascript dates.
    listing.dateCreated = listing.dateCreated.toDate();
    if ('offer' in listing.priceInfo)
        listing.priceInfo.offer.expiryDate = listing.priceInfo.offer.expiryDate.toDate();
    
    // Set the current price of the listing.
    listing.currentPrice = listing.priceInfo.regularPrice;
    if ('offer' in listing.priceInfo && listing.priceInfo.offer.expiryDate.getTime() >= Date.now())
        listing.currentPrice = listing.priceInfo.offer.discountedPrice;
    
    return listing;
} // async function transformListingData(listing)


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
    const path = `${VarNames.PROVINCES}/${provincialCode}`;
    return getDocument(path);
} // export function getProvince(provincialCode) {

export function getMunicipality(provincialCode, municipalityCode) {
    /** Get the municipality with the specified provincial and municipality codes.
        {
            code,
            name
        }
     */
    const path = `${VarNames.PROVINCES}/${provincialCode}/${VarNames.MUNICIPALITIES}/${municipalityCode}`;
    return getDocument(path);
} // export function getMunicipality(provincialCode, municipalityCode) {

export function getMainPlace(provincialCode, municipalityCode, mainPlaceCode) {
    /** Get the main place.
        {
            code,
            name
        }
     */
    const path = `${VarNames.PROVINCES}/${provincialCode}/${VarNames.MUNICIPALITIES}/${municipalityCode}/${VarNames.MAIN_PLACES}/${mainPlaceCode}`;
    return getDocument(path);
} // export function getMainPlace(provincialCode, municipalityCode, mainPlaceCode) {


export function getSubPlace(provincialCode, municipalityCode, mainPlaceCode, subPlaceCode) {
    /** Get the main place.
        {
            code,
            name
        }
     */
    const path = `${VarNames.PROVINCES}/${provincialCode}/${VarNames.MUNICIPALITIES}/${municipalityCode}/${VarNames.MAIN_PLACES}/${mainPlaceCode}/`
                    + `${VarNames.SUB_PLACES}/${subPlaceCode}`;
    return getDocument(path);
} // export function getMunicipality(provincialCode, municipalityCode) {

/** Build and return a query object based on the supplied parameters. 
 * @param {*} places An array of places. Can be an array of provincial codes (string array), municipalities or mainPlaces
*/
export function getListingsByPlacesQueryObject(places = null, transactionTypes = null, 
                                                propertyTypes = null, numberOfBedrooms = null, offersOnly = false, 
                                                numDocs = null, snapshotDoc = null, fetchType = null) {
    let placeType;
    let collectionRef = collection(db, '/listings');
    const unFlaggedContraint = where('flagged', '==', false);
    const addressConstraints = [];

    if (places) {
        if (!(places?.length)) {
            throw new Error('places must be a non-empty array.');
        }
    
        // Verifying the type of places provided.
        const testPlace = places[0];
        if ((typeof testPlace) === 'string') {
            placeType = 'province';
        }
        else if (hasAll(testPlace,
                    'code', // main place code
                    'municipalityCode',
                    'provincialCode')) {
            placeType = 'mainPlace';
        }
        else if (hasAll(testPlace,
                        'code', // municipality code
                        'provincialCode')) {
            placeType = 'municipality';
        }
        else
            throw new Error('Please ensure that the place objects have the correct fields.');
    
        if (![null, FetchTypes.END_AT_DOC, FetchTypes.START_AFTER_DOC].includes(fetchType))
            throw(new Error(`fetchType must be one of ${FetchTypes.toString()}`));
    
        if (snapshotDoc === null && fetchType !== null) // A doc must be specified for non-null fetchType
            throw new Error(`fetchType is ${fetchType}, but the document is null.`);
    
        if (fetchType === null && numDocs === null)
            throw new Error('numDocs must be specified.');
    
        if (placeType === 'province') {
            const codes = places;
            codes.forEach(code=> {
                const constr = and(
                    where('address.provincialCode', '==', code)
                );
                addressConstraints.push(constr);
            });
        }
        else if (placeType === 'municipality') {
            const municipalities = places;
            municipalities.forEach(municipality=> {
                const constr = and(
                    where('address.provincialCode', '==', municipality.provincialCode),
                    where('address.municipalityCode', '==', municipality.code)
                );
                addressConstraints.push(constr);
            });
        }
        else if (placeType === 'mainPlace') {
            const mainPlaces = places;
            mainPlaces.forEach(mainPlace=> {
                const constr = and(
                                    where('address.provincialCode', '==', mainPlace.provincialCode),
                                    where('address.municipalityCode', '==', mainPlace.municipalityCode),
                                    where('address.mainPlaceCode', '==', mainPlace.code),
                                );
                addressConstraints.push(constr);
            });
        }  
    } // if (places)

    const moreConstraints = [];

    if (transactionTypes?.length) {
        moreConstraints.push(
            where('transactionType', 'in', transactionTypes)
        );
    }
    if (propertyTypes?.length)
        moreConstraints.push(
            where('propertyType', 'in', propertyTypes)
        );
    if (numberOfBedrooms?.length)
        moreConstraints.push(
            where('numBedrooms', 'in', numberOfBedrooms)
        );

    if (offersOnly) {
        moreConstraints.push(where('priceInfo.offer.expiryDate', '!=', null));
    } // if (offersOnly) {

    const moreConstraints2 = [];
    if (numDocs !== null)
        moreConstraints2.push(limit(numDocs));

    if (snapshotDoc !== null) {
        if (fetchType === FetchTypes.START_AFTER_DOC)
            moreConstraints2.push(startAfter(snapshotDoc));
        else if (fetchType === FetchTypes.END_AT_DOC) // Typically for creating listeners.
            moreConstraints2.push(endAt(snapshotDoc));
    } // if (snapshotDoc !== null) {

    const andConstraints = [unFlaggedContraint];
    if (addressConstraints.length > 0) {
        andConstraints.push(or(...addressConstraints));
    }
    if (moreConstraints.length > 0) {
        andConstraints.push(moreConstraints);
    };

    const myQuery = query(
                    collectionRef,
                    and(
                        unFlaggedContraint,
                        or(...addressConstraints),
                        ...moreConstraints
                    ),
                    ...moreConstraints2
                );
    return myQuery;
} // function getListingsByPlacesQueryObject() {


/**Get query object for all unflagged listings. */
export function getAllListingsQueryObject(numDocs = null, snapshotDoc = null, fetchType = null) {
    console.log('getAllListingsQueryObject');
    let collectionRef = collection(db, '/listings');
    if (![null, FetchTypes.END_AT_DOC, FetchTypes.START_AFTER_DOC].includes(fetchType))
        throw(new Error(`fetchType must be one of ${FetchTypes.toString()}.`));

    if (snapshotDoc === null && fetchType !== null) // A doc must be specified for non-null fetchType
        throw new Error(`fetchType is ${fetchType}, but the document is null.`);
    
    if (fetchType === null && numDocs === null)
        throw new Error('numDocs must be specified.');

    const constraints = [
                            where('flagged', '==', false)
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
} // function getAllListingsQueryObject(numDocs = null, snapshotDoc = null, fetchType = null) {

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
                            where('flagged', '==', false), 
                            where('userId', '==', userId),
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
    const path = VarNames.PROVINCES;
    return getCollectionDocs(path);
} // export function getAllProvinces() {

/** Return an array of municipality documents of a province. {code, name} */
export function getMunicipalitiesPerProvince(provincialCode) {
    
    const path = `${VarNames.PROVINCES}/${provincialCode}/${VarNames.MUNICIPALITIES}`;
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
    const path = `${VarNames.PROVINCES}/${provincialCode}/${VarNames.MUNICIPALITIES}/${municipalityCode}/${VarNames.MAIN_PLACES}`;
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
    const path = `${VarNames.PROVINCES}/${provincialCode}/${VarNames.MUNICIPALITIES}/${municipalityCode}/${VarNames.MAIN_PLACES}/${mainPlaceCode}/${VarNames.SUB_PLACES}`;
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
