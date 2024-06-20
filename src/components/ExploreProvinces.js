/**File: ./src/components/ExploreProvinces.js
 * Description: Display count of and navigation to available listings per province.
 * Date        Dev  Version  Description
 * 2024/04/25  ITA  1.00     Genesis.
 * 2024/06/19  ITA  1.01     Complete functionality.
 * 
 */
import { NavLink } from "react-router-dom";
import Loader from "./Loader";
import { getAllProvinces, getListingCountPerProvince } from "../utilityFunctions/firestoreComms";
import { useRef, useState, useEffect } from "react";

function ExploreProvinces() {
    const [provinces, setProvinces] = useState([]);
    const [provincesLoaded, setProvincesLoaded] = useState(true);
    const firstRenderRef = useRef(true);
    const [aKey, setTheKey] = useState(1);
    const keyStep = 0.000000000001;

    async function getProvincialListingCount() {        
        let theProvinces = await getAllProvinces();
        
        for (const index in theProvinces) {
            const aProvince = theProvinces[index];
            aProvince.listingCount = await getListingCountPerProvince(aProvince.code);
        }
        theProvinces = theProvinces.filter(province=> province.listingCount > 0);
        setProvinces(theProvinces);
    } // function getProvincialListingCount() {

    useEffect(() => {        
        async function setData() {
            setProvincesLoaded(false);
            await getProvincialListingCount();
            setProvincesLoaded(true);
        } // async function setData() {

        if (firstRenderRef.current) {
            setData();
            firstRenderRef.current = false;
        } // if (firstRenderRef.current) {
    }, [aKey]); // useEffect(()

    function reload() {
        // This will cause the useEffect code to run, thereby reloading the listing count.
        firstRenderRef.current = true;
        setTheKey(aKey + keyStep);
    } // function reload() {

    return (
        <div>
            {provincesLoaded?
                <>
                    {(provinces.length > 0) &&
                        provinces.map(province=> {
                            return (
                                <div key={province.code} className="w3-large w3-margin">
                                    <NavLink className="w3-padding" to={`/explore/${province.code}`}>
                                        {province.name} ({province.listingCount})
                                    </NavLink>
                                </div>
                            );
                        })
                    }
                    <NavLink className="w3-btn w3-margin w3-round w3-theme-d5" onClick={e=> reload()}>Reload</NavLink>

                </>
                :
                <Loader message='Loading provinces, please wait ...'/> 
            }
        </div>
    );
} // function ExploreProvinces() {

export default ExploreProvinces;
