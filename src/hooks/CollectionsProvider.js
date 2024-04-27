import { createContext, useRef } from 'react';
import PropTypes from 'prop-types';
import { getPaths } from '../utilityFunctions/commonFunctions';
/**The purpose of this hook is to enable components to share collections of data.
 * An example of a typical application:
 * A component that has dropdowns. Each dropdown displays a collection that is shared with the parent component.
 * Each dropdown may get the collection data (items), set the and get the selected items.
 * The parent component may add a new collection, update the collection data, set and get the selected items.
*/
const collectionsContext = createContext();

function CollectionsProvider({children}) {
    const collectionsRef = useRef({});

    function addCollection(collectionName, data, maxNumSelections = null, primitiveType = false) { 
    /**Add a new collection of documents.
     * maxNumSelections must be specified if working with instances in which you would like to limit the number of items that
     * can selected in multi-selection dropdowns. Otherwise leave or set to null.
     * primitiveType must be set to true when adding a collection that is an array of primitive types (e.g. string array),
     * otherwise leave as false when the collection added holds an array of objects.
    */
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
                [collectionName]: new Collection(collectionName, data, maxNumSelections)
            };
        }
    } // function addCollection(collectionName, data, maxNumSelections = null, primitiveType = false) { 

    function collectionExists(collectionName) {
        return collectionsRef.current[collectionName] !== undefined;
    }

    function updateCollection(collectionName, data) {
    // Update a collection with new data.
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

    function setSelected(collectionName, selectedItems) {
    // Set the selected items of the collection specified by collectionName.
    // Filter out selected items not found in the collection data.
        if (!collectionExists(collectionName))
            throw new Error(`Collection ${collectionName} not found.`);
        
        collectionsRef.current[collectionName].setSelectedItems(selectedItems);
    } // function setSelected((collectionName, selectedItems) {

    function getSelected(collectionName) {    
        // Get a collection's selected items array.    
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

class Collection {
    constructor(pCollectionName, pData, pMaxNumSelections = null, equalityFunction = null) {
        this.collectionName = pCollectionName;  // Name of the collection.
        this.selectedItems = []; // An array of objects that were elected from data.
        this.maxNumSelections = pMaxNumSelections;
        this.data = pData.toSorted(this.comparisonFunction);
    } // constructor(pCollectionName, pData) {

    comparisonFunction(item1, item2) {
        if (getPaths(item1).length === 0) { // Primitive type.
            if (item1 > item2)
                return 1;
            else if (item1 < item2)
                return -1;
            else
                return 0;
        }

    // To enable comparison objectes must have the sort field.
        if ('sortField' in item1
                && 'sortField' in item2) {
            if (item1.sortField > item2.sortField)
                return 1;
            else if (item1.sortField < item2.sortField)
                return -1;
        }
        return 0;            
    } // comparisonFunction(item1, item2) {

    updateData(pData) {
        this.data = pData.toSorted(this.comparisonFunction);

        // Filter out all the selected items not in the updated data.
        this.selectedItems = this.selectedItems.filter(selectedItem=> {
            return this.data.findIndex(dataItem=> {
                // NB. For accurate equality comparisons, developers must create objects with sorted fields and sorted arrays!!                
                return JSON.stringify(dataItem) === JSON.stringify(selectedItem);
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
                // NB. For accurate comparisons, developer must create objects with sorted fields and sorted arrays!!
                return JSON.stringify(dataItem) === JSON.stringify(item);
            }) >= 0;
        });

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

class PrimitiveTypeCollection extends Collection{
    comparisonFunction(item1, item2) {
        if (item1 < item2)
            return -1;
        else if (item1 > item2)
            return 1;
        else
            return 0;
    } // comparisonFunction(item1, item2) {
    
    updateData(pData) {
        this.data = pData.toSorted(this.comparisonFunction);

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