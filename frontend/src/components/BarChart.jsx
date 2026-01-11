import { useState, useEffect } from 'react';
import Chart from 'react-apexcharts';
import toast from 'react-hot-toast';

const BarChart = ({ timeRange }) => {
    const [series, setSeries] = useState([{ name: 'Waste Collected', data: [] }]);
    const [categories, setCategories] = useState([]);
    const [zoneData, setZoneData] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem("auth_token");

    useEffect(() => {
        const fetchWasteData = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/waste-collected-per-zone?time_range=${timeRange}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                         Authorization: `Bearer ${token}`,
                    },
                    credentials: "include",
                });

                if (!response.ok) throw new Error("Failed to fetch waste collected data");
                const result = await response.json();

                if (!result.data || result.data.length === 0) {
                    throw new Error("No waste collected data available");
                }

                const fetchedSeries = result.data.map(item => item.total_quantity);
                const fetchedCategories = result.data.map(item => item.month);
                const fetchedZoneData = result.data.map(item => 
                item.zones.map(zone => ({
                        zone_name: zone.name || `Zone ${result.data.indexOf(item) + 1}`, 
                        quantity: zone.quantity
                    }))
                );
                
                setSeries([{ name: 'Waste Collected', data: fetchedSeries }]);
                setCategories(fetchedCategories);
                setZoneData(fetchedZoneData);
                
            } catch (err) {
                setError(err.message);
                toast.error(`Error: ${err.message}`);
            } 
        };

        fetchWasteData();
    }, [timeRange]);

    const options = {
       series: series,
            chart: {
                type: "bar",
                animations: { enabled: true },
                zoom: { enabled: false },
                toolbar: {
                    tools: {
                        selection: false,
                        zoom: false,
                        zoomin: false,
                        zoomout: false,
                        pan: false,
                        reset: false,
                        download: false,
                    }
                },
            },
            plotOptions: {
                bar: {
                    columnWidth: "50%",
                    borderRadius: 6,
                }
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                width: 0
            },
            fill: {
                opacity: 1,
                colors: ["#1A7E00"]
            },
            grid: {
                show: true,
                borderColor: '#E8E8E8',
                strokeDashArray: 4,
                xaxis: { lines: { show: false } },
                yaxis: { lines: { show: true } },
            },
            xaxis: {
                position: "bottom",
                categories: categories,
            },
            tooltip: {
                intersect: false,
                shared: false,
                custom: function({ series, seriesIndex, dataPointIndex, w }) {
                    const value = series[seriesIndex][dataPointIndex];
                    const month = categories[dataPointIndex];
                    const zones = zoneData[dataPointIndex] || [{ zone_name: `Zone ${dataPointIndex + 1}`, quantity: value }];
                    return (
                        `<div class="tooltip-wrapper">
                           <div class="tooltip-header">${month}</div>
                             <div class="arrow_box">
                                ${zones.map(zone => `
                                <span class="zone-item">
                                ${zone.zone_name}: <b>${zone.quantity.toFixed(2)}KG</b>
                               </span>`).join('<br>')}
                           </div>
                        </div>`
                    );
                }
            },
            yaxis: {
                reversed: false,
                labels: {
                    formatter: (val) => `${val}kg`,
                    style: {
                        colors: '#181818',
                        fontSize: '12px',
                        fontWeight: 500,
                    }
                }
            },
        responsive: [
            {
                breakpoint: 768,
                options: {
                    chart: {
                        height: 250,
                    },
                },
            },
        ],
    };

    return (
        <div className="bar-chart-container">
            <Chart options={options} series={series} type="bar" width="100%" height="350" />
        </div>
    );
};

export default BarChart;