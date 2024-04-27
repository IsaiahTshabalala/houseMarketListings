/**
 * File: ./src/components/Dropdown.js
 * --------------------------------------------------------------------------------
 * Description: 
 * Provide a single selection searchable dropdown that takes an array of primitive types.
 * * --------------------------------------------------------------------------------
 * Date       Dev       Description
 * 2023/12/19 ITA       Genesis.
 */
import PropTypes from 'prop-types';
import { useState, useEffect, useContext, memo } from 'react';
import { RiArrowDropUpLine, RiArrowDropDownLine } from "react-icons/ri";
import { collectionsContext } from '../hooks/CollectionsProvider';
import { toast } from 'react-toastify';
import toastifyTheme from './toastifyTheme';

function Dropdown({label, // label with which to describe the dropdown.
                    collectionName, // the name of the collection.
                    onItemSelected = null, // function to pass on the value of the selected item to the parent component
                    isDisabled=false})
{
    const { getCollectionData, setSelected, getSelected } = useContext(collectionsContext);

    const [w3ShowList, setW3ShowList] = useState(null); // Styling to enable the list of items to show or disappear.
                                                        // Will alernate between 2 values as the Dropdown gains or losses focus
                                                        // And also when an item is selected.
    const [searchText, setSearchText] = useState('');
    const [list, setList] = useState([]);

    async function handleSearch(e) {
        setSearchText(e.target.value);

        try {
            // Return items that contain the search text.
            let aList = [];
            aList = getCollectionData(collectionName);
    
            aList = aList.filter(item=> {
                        const itemValue = item.toUpperCase();
                        const targetValue = e.target.value.toUpperCase();
                        return itemValue.includes(targetValue);
                    });
    
            setList(aList);
            
            if (aList.length === 0)
                hideList();
            else
                showList();
            
        } catch (error) {
            toast.error(error, toastifyTheme);
        }
    } // async function handleSearch(e)

    async function handleItemClick(value) {
        setSearchText(value);
        setSelected(collectionName, [value]);

        if (onItemSelected !== null)
            onItemSelected(); // Alert the parent component that a value has been selected.
        hideList();
    } // function handleItemClick(e) {

    function toggleShowList() {
        if (w3ShowList === null)
            setW3ShowList({display: 'block'});
        else
            setW3ShowList(null);
    } // function toggleShowList() {

    function hideList() {
        setW3ShowList(null);
    }

    function showList() {
        if (list.length === 0)
            setW3ShowList(null);
        else
            setW3ShowList({display: 'block'});
    } // function showList() {

    useEffect(()=> {        
        (async ()=> {
            try {
                let aList;
                aList = getCollectionData(collectionName);
                setList(aList);
                const result = getSelected(collectionName);
                if (result.length > 0)
                    setSearchText(result[0]);
                else
                    setSearchText(''); // No selected item found.                
            } catch (error) {                
                /* Ignore this error, because the collection data will load eventually.
                    Pop up error messages can be a nuissance if you have several dropdowns. */
            }
        })();
    }, []); // useEffect(()=> {

    return (
        <div style={isDisabled? { pointerEvents: 'none'}: {}}>
            <label htmlFor='searchDropDown w3-padding-small'>{label}</label>
            <div className='w3-padding-small'>
                <div className='side-by-side' style={{width: '80%'}}>
                    <input className={`w3-input-theme-1 w3-input`} autoComplete='off'
                            type='text' id='searchDropDown' name='searchDropDown'
                            aria-label={`Type to Search for ${label}`} aria-required={true} onChange={e=> handleSearch(e)}
                            disabled={isDisabled}
                            onFocus={e=> showList()} placeholder='Type to search' value={searchText} />
                </div>
                <div className='w3-xlarge side-by-side' onClick={e=> toggleShowList(e)}>
                    <b>
                        {w3ShowList === null? <RiArrowDropDownLine/> : <RiArrowDropUpLine/>}
                    </b>
                </div>
            </div>

            <div className=' w3-padding-small'>
                <div className='w3-input-theme-1 w3-margin-left w3-dropdown-content w3-bar-block w3-border' id='dropDown' name='dropDown' disabled={isDisabled} aria-label={label} 
                         style={w3ShowList}>
                    {list.map((item, index)=> {
                            return (
                                <div className='w3-bar-item w3-button' name={item} key={item} aria-label={item}
                                        onClick={e=> handleItemClick(item)} onFocus={e=> showList()}>
                                    {item}
                                </div>
                            );
                        }) // list.map(item=> {
                    }
                </div>
            </div>
        </div>
    );
}

Dropdown.propTypes = {
    label: PropTypes.string.isRequired,
    isDisabled: PropTypes.bool,
    onItemSelected: PropTypes.func
};

export default memo(Dropdown); // memo to prevent the component from re-rendering unless its props have changed.