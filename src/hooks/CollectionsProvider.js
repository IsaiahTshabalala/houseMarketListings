
/**
 * File: ./src/hooks/CollectionsProvider.js
 * Description:
 * A useContext hook.
 * The purpose of this hook is to enable components to share collections of data.
 * An example of a typical application:
 * A component that has dropdowns. Each dropdown displays a collection that is shared with the parent component.
 * Each dropdown may get the collection data (items), and set the selected items.
 * The parent component may add a new collection, update the collection data, set and get the selected items.
 * 
 * Date        Dev   Version  Description
 * 2024/02/16  ITA   1.00     Genesis.
 * 2024/05/20  ITA   1.01     Add comment header.
 * 2024/07/03  ITA   1.03     Move descriptions of classes, methods and functions of to the top, to enable them to be displayable on the documentation tips.
 *                            Replace the JSON.stringify comparison and use a proper comparison function instead.
*/
import { createContext, useRef } from 'react';
import PropTypes from 'prop-types';
import { objCompare, compare, getPaths } from '../utilityFunctions/commonFunctions';

const collectionsContext = createContext();

function CollectionsProvider({children}) {
    const collectionsRef = useRef({});
    
    /**Add a new collection of documents.
     * maxNumSelections must be specified if working with instances in which you would like to limit the number of items that
     * can selected in multi-selection dropdowns. Otherwise leave or set to null.
     * primitiveType must be set to true when adding a collection that is an array of primitive types (e.g. string array),
     * otherwise leave as false when the collection added holds an array of objects.
    */
    function addCollection(collectionName, data, maxNumSelections = null, primitiveType = false, ...sortFields) { 
        if (collectionExists(collectionName)) {
            throw new Error(`The collection ${collectionName} already exists.`);
        }  

        if (primitiveType) {
            collectionsRef.current = {
                ...collectionsRef.current,
                [collectionName]: new PrimitiveTypeCollection(collectionName, data, maxNumSelections)
            };
        }
        else {
            collectionsRef.current = {
                ...collectionsRef.current,
                [collectionName]: new Collection(collectionName, data, maxNumSelections, ...sortFields)
            };
        }
    } // function addCollection(collectionName, data, maxNumSelections = null, primitiveType = false) { 

    function collectionExists(collectionName) {
        return collectionsRef.current[collectionName] !== undefined;
    }

    /** Update a collection with new data.*/
    function updateCollection(collectionName, data) {
        if (!collectionExists(collectionName))
            throw new Error(`Collection ${collectionName} not found.`);

        collectionsRef.current[collectionName].updateData(data);
    } // function updateCollection(collectionName, data) {
    
    function getCollectionData(collectionName) {
        // 
        if (!collectionExists(collectionName))
            throw new Error(`Collection ${collectionName} not found.`);

        return collectionsRef.current[collectionName].getData();
    } // function getCollectionData(collectionName) {
    
    /** Set the selected items of the collection specified by collectionName.
     * Remove selected items not found in the collection data. */
    function setSelected(collectionName, selectedItems) {
        if (!collectionExists(collectionName))
            throw new Error(`Collection ${collectionName} not found.`);

        collectionsRef.current[collectionName].setSelectedItems(selectedItems);
    } // function setSelected((collectionName, selectedItems) {

    /** Get a collection's selected items array. */
    function getSelected(collectionName) {
        if (!collectionExists(collectionName))
            throw new Error(`Collection ${collectionName} not found.`);

        return collectionsRef.current[collectionName].getSelectedItems();
    } // function getSelected((collectionName) {

    function getMaxNumSelections(collectionName) {
        // Get a collection's selected items array.    
        if (!collectionExists(collectionName))
            throw new Error(`Collection ${collectionName} not found.`);

        return collectionsRef.current[collectionName].getMaxNumSelections();
    }

    return (
        <collectionsContext.Provider
            value= {
                {
                    addCollection,
                    collectionExists,
                    getCollectionData,
                    updateCollection,
                    setSelected,
                    getSelected,
                    getMaxNumSelections
                }
            } >
            {children}
        </collectionsContext.Provider>
    );
}

CollectionsProvider.propTypes = {
    children: PropTypes.element.isRequired
};

export default CollectionsProvider;
export { collectionsContext };

/**The Collection class.
 * Stores array of related object items to be displayed and selected with single and multi-selection dropdown components.
 */
class Collection {
    constructor(pCollectionName, pData, pMaxNumSelections = null, ...pSortFields) {
        this.sortFields = pSortFields; // e.g. ['surname asc', ''lastName asc']
        this.collectionName = pCollectionName;  // Name of the collection.
        this.selectedItems = []; // An array of objects that were elected from data.
        this.maxNumSelections = pMaxNumSelections;
        this.data = [...pData];
        this.sortData(...this.sortFields);
    } // constructor(pCollectionName, pData) {

    sortData() {
        this.data.sort(this.comparisonFunction);
    }

    /**Facilitate comparison of collection objects during sorting. 
     * Since this function is passed to an external function this.data.sort,
     * it had to be made an arrow function to be able to pass on this class' data.
    */
    comparisonFunction = (item1, item2)=> {
        /** Must accomodate calls from the sub-classes as well.
         * Given that the sub-classes will call the constructor that
         * uses a sort function, whose call gets here.
        */

        if (typeof item1 === 'object' && typeof item2 === 'object') {
            if (this.sortFields.length > 0)
                return objCompare(item1, item2, ...this.sortFields);
        }
        else if (this.sortFields.length === 1) // Primitive type data. Sort order provided.
            return compare(item1, item2, this.sortFields[0]);
        else if (this.sortFields.length === 0) // Primitive type data. Sort order no provided. Will default to 'asc'
            return compare(item1, item2);
        else
            throw new Error('Only 1 sort order can be provided for a primitive data type collection.');
        return 0;            
    } // comparisonFunction = (item1, item2)=> {

    updateData(pData) {
        this.data = [...pData];
        this.sortData();

        // Remove all the selected items not in the updated data.
        let paths = null;
        this.selectedItems = this.selectedItems.filter(selectedItem=> {
            return this.data.findIndex(dataItem=> {
                if (paths === null) // It is assumed that the data items share exactly the same fields.
                    paths = getPaths(dataItem);
                return objCompare(dataItem, selectedItem, ...paths) === 0;
            }) >= 0;
        }); // this.selectedItems = this.selectedItems.filter(selectedItem=> {

        this.selectedItems = this.selectedItems.toSorted(this.comparisonFunction);
    } // updateData(pData) {

    setSelectedItems(pSelectedItems) {
        if (this.maxNumSelections !== null && pSelectedItems.length > this.maxNumSelections)
            throw new Error('Selected items exceed the maximum number of allowed selections.');

        //  Filter out items not in data.
        let paths = null;
        pSelectedItems = pSelectedItems.filter(selectedItem=> {
            return this.data.findIndex(dataItem=> {
                if (paths === null) // It is assumed that the data items share exactly the same fields.
                    paths = getPaths(dataItem);
                return objCompare(dataItem, selectedItem, ...paths) === 0;
            }) >= 0;
        }); // pSelectedItems = pSelectedItems.filter(selectedItem=> {

        this.selectedItems = pSelectedItems.toSorted(this.comparisonFunction);
    } // setSelectedItems(pSelectedItems) {

    getData() {
        return this.data;
    }

    getSelectedItems() {
        return this.selectedItems;
    }

    getCollectionName() {
        return this.collectionName;
    }

    getMaxNumSelections() {
        return this.maxNumSelections;
    }
} // class Collection {

/**Stores an array of related primitive type items for use with single and multi selection dropdown compoents. */
class PrimitiveTypeCollection extends Collection {
    constructor(pCollectionName, pData, pMaxNumSelections = null, pSortOrder = 'asc') {
        super(pCollectionName, pData, pMaxNumSelections = null, pSortOrder);
    }

    comparisonFunction(item1, item2) {
        return compare(item1, item2, this.sortFields[0]);
    } // comparisonFunction(item1, item2) {

    sortData(pData) {
        this.data.sort(this.comparisonFunction);
    }

    updateData(pData) {
        this.data = [...pData];
        this.sortData();

        // Filter out all the selected items not in the updated data.
        this.selectedItems = this.selectedItems.filter(selectedItem=> {
            return this.data.findIndex(dataItem=> {
                return dataItem === selectedItem;
            }) >= 0;
        });

        this.selectedItems = this.selectedItems.toSorted(this.comparisonFunction);
    } // updateData(pData) {

    setSelectedItems(pSelectedItems) {
        if (this.maxNumSelections !== null && pSelectedItems.length > this.maxNumSelections)
            throw new Error('Selected items exceed the maximum number of allowed selections.');

        //  Filter out items not in data.
        pSelectedItems = pSelectedItems.filter(item=> {
            return this.data.findIndex(dataItem=> {
                return dataItem === item;
            }) >= 0;
        });

        this.selectedItems = pSelectedItems.toSorted(this.comparisonFunction);
    } // setSelectedItems(pSelectedItems) {
}