/**
 * File: ./src/components/Dropdown2.js
 * --------------------------------------------------------------------------------
 * Description: 
 * Provide a single selection, searchable dropdown that takes an array of objects.
 * A developer must specify which field name to use for displaying (the keyName), and which field name to use as value (valueName).
 * * --------------------------------------------------------------------------------
 * Date       Dev       Description
 * 2023/12/19 ITA       Genesis.
 */
import PropTypes from 'prop-types';
import { useEffect, useState, useContext, memo } from 'react';
import { RiArrowDropUpLine, RiArrowDropDownLine } from "react-icons/ri";
import { collectionsContext } from '../hooks/CollectionsProvider';
import { toast } from 'react-toastify';
import toastifyTheme from './toastifyTheme';

function Dropdown2({label, // label with which to describe the dropdown.
                    collectionName,  // Name of the collection from which to display items.
                    keyName, // the name of the field that will be used for displaying the list items to the user.
                    valueName, // the name of the field that will be used as the underlying value of each list item.
                    onItemSelected = null, // Function to be called to alert the parent component on selection of an item.
                    isDisabled=false}) 
{
    const { getCollectionData,
            setSelected,
            getSelected } = useContext(collectionsContext);

    const [w3ShowList, setW3ShowList] = useState(null); // Styling to enable the list of items to show or disappear.
                                                        // Will alernate between 2 values as the Dropdown gains or losses focus
                                                        // And also when an item is selected.
    const [list, setList] = useState([]);
    const [searchText, setSearchText] = useState('');

    async function handleSearch(e) {
        setSearchText(e.target.value);

        try {
            let aList = getCollectionData(collectionName);
            aList = aList.filter(item=> {
                const itemValue = item[keyName].toUpperCase();
                const targetValue = e.target.value.toUpperCase();
                return itemValue.includes(targetValue);
            });
            setList(aList);
            showList();
        } catch (error) {
            toast.error(error, toastifyTheme);
        }
    } // function handleSearch(e)

    function handleItemClick(clickedItem) {
        setSearchText(clickedItem[keyName]);
        setSelected(collectionName, [clickedItem]);

        if (onItemSelected !== null)
            onItemSelected(); // Alert the parent component that a new selection was made.
        
        hideList();
    } // function handleItemClick(e) {

    function toggleShowList() {
        if (w3ShowList === null)
            setW3ShowList({display: 'block'});
        else
            setW3ShowList(null);
    } // function toggleShowList() {

    function hideList() {
        setW3ShowList(prev=> null);
    }

    function showList() {
        setW3ShowList(prev=> ({display: 'block'}));
    }

    useEffect(()=> {
        (async ()=> {
            try {
                let result = getCollectionData(collectionName);
                setList(result);
                result = getSelected(collectionName);

                if (result.length > 0)
                    setSearchText(result[0][keyName]);
                else
                    setSearchText(''); // No selected item found.
            } catch (error) {
                toast.error(error, toastifyTheme);
            }
        })();
    }, []); // useEffect(()=> {

    return (
        <div style={isDisabled? { pointerEvents: 'none'}: {}}>
            <label htmlFor='searchDropDown w3-padding-small'>{label}</label>
            <div className='w3-padding-small'>
                <div className='side-by-side'  style={{width: '80%'}}>
                    <input className={`w3-input-theme-1 w3-input`}
                            type='text' id='searchDropDown' name='searchDropDown' autoComplete='off'
                            aria-label={`Type to Search for ${label}`} aria-required={true} onChange={e=> handleSearch(e)}
                            disabled={isDisabled}
                            onFocus={e=> showList()}
                            placeholder='Type to search' value={searchText} />
                </div>
                <div className='w3-xlarge side-by-side' onClick={e=> toggleShowList(e)}>
                    <b>
                        {w3ShowList === null? <RiArrowDropDownLine/> : <RiArrowDropUpLine/>}
                    </b>
                </div>
            </div>

            <div className=' w3-padding-small'>
                <div className='w3-input-theme-1 w3-dropdown-content w3-bar-block w3-border' id='dropDown' name='dropDown' aria-label={label} 
                         style={w3ShowList}>
                    {list.map((item, index)=> {
                                            return (
                                                <div className='w3-bar-item w3-button' name={item[keyName]} key={item[keyName]} aria-label={item[keyName]} 
                                                     onClick={e=> handleItemClick(item)} onFocus={e=> showList()}>
                                                    {item[keyName]}
                                                </div>
                                            );
                                        }) // list.map(item=> {
                    }
                </div>
            </div>
        </div>
    );
}

Dropdown2.propTypes = {
    label: PropTypes.string.isRequired,
    keyName: PropTypes.string.isRequired,
    valueName: PropTypes.string.isRequired,
    isDisabled: PropTypes.bool,
    onItemSelected: PropTypes.func
};

export default memo(Dropdown2);