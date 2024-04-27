/**File: ./src/components/ExploreProvinces.js
 * Description: 
 */
import ExploreProvince from "./ExploreProvince";
import { getAllProvinces } from "../utilityFunctions/firestoreComms";
import { useRef, useState, useEffect } from "react";

function ExploreProvinces() {
    const [provinces, setProvinces] = useState([]);
    const [provincesKey, setProvincesKey] = useState(Math.random());
    const keyStep = 0.00000000000000001;
    const firstRenderRef = useRef(true);

    useEffect(() => {
        if (firstRenderRef.current) {
            setData();
            firstRenderRef.current = false;
        } // if (firstRenderRef.current) {

        async function setData() {
            let theProvinces = await getAllProvinces();
            setProvinces(theProvinces);
        } // async function setData() {
    }, [provincesKey]); // useEffect(()

    return (
        <div key={provincesKey}>
            {
                (provinces.length > 0) &&
                    provinces.map(prov=> {
                        return <ExploreProvince key={prov.code} province={prov}/>;
                    })
            }
        </div>
    );
} // function ExploreProvinces() {

export default ExploreProvinces;
