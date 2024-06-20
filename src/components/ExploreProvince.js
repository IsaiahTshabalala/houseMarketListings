/**
 * File: ./src/components/ExploreProvince.js
 * Description: Provide count of and navigation to available listings of the province, grouped according to the municipalities and main places.
 * Date         Dev  Verison  Description
 * 2024/04/25   ITA  1.00     Genesis.
 * 2024/05/01   ITA  1.01     Continue with adding functionality.
 */
import { memo, useEffect, useState, useContext, useRef } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { sharedVarsContext } from '../hooks/SharedVarsProvider';
import { getProvince, getListingCountPerMainPlace, getListingCountPerMunicipality,
         getMainPlacesOfTheMunicipalities, getMunicipalitiesPerProvince, PROVINCES,
         getListingsPerMainPlaceQueryObject, GET_LISTINGS_QUERY_OBJECT} from '../utilityFunctions/firestoreComms';
import Loader from './Loader';

function ExploreProvince() {
    const params = useParams();
    const navigate = useNavigate();
    const [province, setProvince] = useState(null);
    const [theMunicipalities, setTheMunicipalities] = useState([]);
    const [municipalitiesLoaded, setMunicipalitiesLoaded] = useState(true);
    const {varExists, addVar} = useContext(sharedVarsContext);
    const [aKey, setTheKey] = useState(1);
    const keyStep = 0.000000000001;
    const firstRenderRef = useRef(true);

    async function getMainPlaceAndMunicipalityListingCount() {
        const aProvince = await getProvince(params.provincialCode);

        if (aProvince === null)
            navigate('/error/Province not found');

        setProvince(aProvince);
        setMunicipalitiesLoaded(false);
        let municipalities = await getMunicipalitiesPerProvince(params.provincialCode);

        let index;
        for (index in municipalities) {
            const municipality = municipalities[index];
            municipality.provincialCode = params.provincialCode;
            municipality.listingCount = await getListingCountPerMunicipality(municipality.provincialCode,
                                                                             municipality.code);
        } // for (index in municipalities) {

        municipalities = municipalities.filter(municipality=> municipality.listingCount > 0);

        // Add main places to the municipalities
        index = -1;
        await getMainPlacesOfTheMunicipalities(municipalities)
                .then(results=> {
                    results.forEach(result=> {
                        index++;
                        const municipality = municipalities[index];
                        
                        if (result.status === 'fulfilled') {
                            municipality.mainPlaces = result.value;
                        }
                    });
                });

        for (index in municipalities) {
            const municipality = municipalities[index];

            for (const index2 in municipality.mainPlaces) {
                // Add the listingCount field to each main place of the municipality.
                const mainPlace = municipality.mainPlaces[index2];
                mainPlace.listingCount = await getListingCountPerMainPlace(mainPlace.provincialCode, 
                                                                            mainPlace.municipalityCode,
                                                                            mainPlace.code);
            } // for (const index2 in municipality.mainPlaces)
            municipality.mainPlaces = municipality.mainPlaces.filter(mainPlace=> mainPlace.listingCount > 0);
            municipality.mainPlaces.sort((mainPlace1, mainPlace2)=> {
                return mainPlace1.name.localeCompare(mainPlace2.name);
            });
        } // for (const index in mainPlaces)

        // Remove municipalities with zero listing counts.
        municipalities = municipalities.filter(municipality=> municipality.listingCount > 0);

        municipalities.sort((municipality1, municipality2)=> {
            return municipality1.name.localeCompare(municipality2.name);
        });

        setTheMunicipalities(municipalities);
        setMunicipalitiesLoaded(true);
    } // async function getMainPlaceAndMunicipalityListingCount()

    useEffect(() => {
        if (firstRenderRef.current) {
            setMunicipalitiesLoaded(false);
            getMainPlaceAndMunicipalityListingCount();
            
            if (!varExists(GET_LISTINGS_QUERY_OBJECT))
                addVar(GET_LISTINGS_QUERY_OBJECT, getListingsPerMainPlaceQueryObject);
    
            setMunicipalitiesLoaded(true);
            firstRenderRef.current = false;
        }
    }, [aKey]);
    
    function reload() {
        // Cause the useEffect to run, thereby reloading listing counts.
        firstRenderRef.current = true;
        setTheKey(aKey + keyStep);
    }
    
    return (
        <div className='w3-container'>
            <h3>{province === null? '' : province.name}</h3>

            {municipalitiesLoaded?
                <>
                    {theMunicipalities.length > 0?
                        theMunicipalities.map(municipality=> {
                            return (                   
                                <div key={municipality.code} className='w3-card w3-margin'>
                                    <header className='w3-container'>
                                        <h3>{municipality.name} ({municipality.listingCount})</h3>
                                    </header>                                    
                                 
                                    <div className='w3-container'>
                                        {municipality.mainPlaces.map(mainPlace=> {
                                                return (                                                
                                                    <NavLink key={mainPlace.code} to={`/explore/${params.provincialCode}/${municipality.code}/${mainPlace.code}`}>
                                                        <div className='w3-card side-by-side w3-margin-left w3-padding'>
                                                            {mainPlace.name} ({mainPlace.listingCount})
                                                        </div>
                                                    </NavLink>
                                                );
                                            }
                                        )}
                                    </div>
                                </div>
                            );
                        }) 
                        :
                        <p>
                            Municipalities with listings not found ...
                        </p>
                    }
                    <p>
                        <NavLink className="w3-btn w3-margin w3-round w3-theme-d5" onClick={e=> reload()}>Reload</NavLink>
                    </p>
                </>
                :
                <Loader message='Loading municipalities. Please wait ...'/>
            }

            <NavLink className="w3-btn w3-round w3-theme-d5" to='/'>Back to Explore</NavLink>
        </div>
    );
}

export default memo(ExploreProvince);
