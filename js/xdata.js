/* SondeHub XDATA Parser Library
 *
 * Authors: Mark Jessop & Luke Prior
 */

// Pump Efficiency Correction Parameters for ECC-6A Ozone Sensor, with 3.0cm^3 volume.
// We are using these as a nominal correction value for pump efficiency vs pressure
// 
OIF411_Cef_Pressure =    [    0,     2,     3,      5,    10,    20,    30,    50,   100,   200,   300,   500, 1000, 1100];
OIF411_Cef = [ 1.171, 1.171, 1.131, 1.092, 1.055, 1.032, 1.022, 1.015, 1.011, 1.008, 1.006, 1.004,    1,    1];

function lerp(x, y, a){
    // Helper function for linear interpolation between two points
    return x * (1 - a) + y * a
}


function get_oif411_Cef(pressure){
    // Get the Pump efficiency correction value for a given pressure.

    // Off-scale use bottom-end value
    if (pressure <= OIF411_Cef_Pressure[0]){
        return OIF411_Cef[0];
    }
    
    // Off-scale top, use top-end value
    if (pressure >= OIF411_Cef_Pressure[OIF411_Cef_Pressure.length-1]){
        return OIF411_Cef[OIF411_Cef.length-1];
    }
    

    // Within the correction range, perform linear interpolation.
    for(i= 1; i<OIF411_Cef_Pressure.length; i++){
        if (pressure < OIF411_Cef_Pressure[i]) {
            return lerp(OIF411_Cef[i-1], OIF411_Cef[i],  ( (pressure-OIF411_Cef_Pressure[i-1]) / (OIF411_Cef_Pressure[i]-OIF411_Cef_Pressure[i-1])) );
        }
    }

    // Otherwise, bomb out and return 1.0
    return 1.0;
}

function parseOIF411(xdata, pressure){
    // Attempt to parse an XDATA string from an OIF411 Ozone Sounder
    // Returns an object with parameters to be added to the sondes telemetry.
    //
    // References: 
    // https://www.vaisala.com/sites/default/files/documents/Ozone%20Sounding%20with%20Vaisala%20Radiosonde%20RS41%20User%27s%20Guide%20M211486EN-C.pdf
    //
    // Sample data:      0501036402B958B07500   (length = 20 characters)
    // More sample data: 0501R20234850000006EI (length = 21 characters)

    // Cast to string if not already
    xdata = String(xdata);

    // Run some checks over the input
    if(xdata.length < 20){
        // Invalid OIF411 dataset
        return {};
    }

    if(xdata.substr(0,2) !== '05'){
        // Not an OIF411 (shouldn't get here)
        return {};
    }

    var _output = {};

    // Instrument number is common to all XDATA types.
    _output['oif411_instrument_number'] = parseInt(xdata.substr(2,2),16);


    if(xdata.length == 21){
        // ID Data (Table 19)
        // Serial number
        _output['oif411_serial'] = xdata.substr(4,8);

        // Diagnostics word. 
        _diagnostics_word = xdata.substr(12,4);
        if(_diagnostics_word == '0000'){
            _output['oif411_diagnostics'] = "All OK";
        }else if(_diagnostics_word == '0004'){
            _output['oif411_diagnostics'] = 'Ozone pump temperature below -5 °C.';
        }else if(_diagnostics_word == '0400'){
            _output['oif411_diagnostics'] = 'Ozone pump battery voltage (+VBatt) is not connected to OIF411';
        }else if (_diagnostics_word == '0404'){
            _output['oif411_diagnostics'] = 'Ozone pump temp low, and +VBatt not connected.';
        }else {
            _output['oif411_diagnostics'] = 'Unknown State: ' + _diagnostics_word;
        }

        // Version number
        _output['oif411_version'] = (parseInt(xdata.substr(16,4),16)/100).toFixed(2);

        return _output
    } else if (xdata.length == 20){
        // Measurement Data (Table 18)
        // Ozone pump temperature - signed int16
        _ozone_pump_temp = parseInt(xdata.substr(4,4),16);
        if ((_ozone_pump_temp & 0x8000) > 0) {
            _ozone_pump_temp = _ozone_pump_temp - 0x10000;
        }
        _ozone_pump_temp = _ozone_pump_temp*0.01; // Degrees C (5 - 35)
        _output['oif411_ozone_pump_temp'] = Math.round(_ozone_pump_temp * 100) / 100; // 2 DP

        // Ozone Current
        _ozone_current_uA = parseInt(xdata.substr(8,5),16)*0.0001; // micro-Amps (0.05 - 30)
        _output['oif411_ozone_current_uA'] = Math.round(_ozone_current_uA * 10000) / 10000; // 4 DP

        // Battery Voltage
        _ozone_battery_v = parseInt(xdata.substr(13,2),16)*0.1; // Volts (14 - 19)
        _output['oif411_ozone_battery_v'] = Math.round(_ozone_battery_v * 10) / 10; // 1 DP

        // Ozone Pump Current
        _ozone_pump_curr_mA = parseInt(xdata.substr(15,3),16); // mA (30 - 110)
        _output['oif411_ozone_pump_curr_mA'] = Math.round(_ozone_pump_curr_mA * 10) / 10; // 1 DP

        // External Voltage
        _ext_voltage = parseInt(xdata.substr(18,2),16)*0.1; // Volts
        _output['oif411_ext_voltage'] = Math.round(_ext_voltage * 10) / 10; // 1 DP

        // Now attempt to calculate the O3 partial pressure

        // Calibration values
        Ibg = 0.0; // The BOM appear to use a Ozone background current value of 0 uA
        Cef = get_oif411_Cef(pressure); // Calculate the pump efficiency correction.
        FlowRate = 28.5; // Use a 'nominal' value for Flow Rate (seconds per 100mL).

        _O3_partial_pressure = (4.30851e-4)*(_output['oif411_ozone_current_uA'] - Ibg)*(_output['oif411_ozone_pump_temp']+273.15)*FlowRate*Cef; // mPa
        _output['oif411_O3_partial_pressure'] = Math.round(_O3_partial_pressure * 1000) / 1000; // 3 DP

        return _output

    } else {
        return {}
    }
}

function parseCFH(xdata) {
    // Attempt to parse an XDATA string from a CFH Cryogenic Frostpoint Hygrometer
    // Returns an object with parameters to be added to the sondes telemetry.
    //
    // References: 
    // https://eprints.lib.hokudai.ac.jp/dspace/bitstream/2115/72249/1/GRUAN-TD-5_MeiseiRadiosondes_v1_20180221.pdf
    //
    // Sample data:      0802E21FFD85C8CE078A0193   (length = 24 characters)

    // Cast to string if not already
    xdata = String(xdata);

    // Run some checks over the input
    if(xdata.length != 24){
        // Invalid CFH dataset
        return {};
    }

    if(xdata.substr(0,2) !== '08'){
        // Not an CFH (shouldn't get here)
        return {};
    }

    var _output = {};

    // Instrument number is common to all XDATA types.
    _output['cfh_instrument_number'] = parseInt(xdata.substr(2,2),16);

    return _output
}

function parseCOBALD(xdata) {
    // Attempt to parse an XDATA string from a COBALD Compact Optical Backscatter Aerosol Detector
    // Returns an object with parameters to be added to the sondes telemetry.
    //
    // References: 
    // https://hobbydocbox.com/Radio/83430839-Cobald-operating-instructions-imet-configuration.html
    //
    // Sample data:      190213fffe005fcf00359943912cca   (length = 30 characters)

    // Cast to string if not already
    xdata = String(xdata);

    // Run some checks over the input
    if(xdata.length != 30){
        // Invalid COBALD dataset
        return {};
    }

    if(xdata.substr(0,2) !== '19'){
        // Not a COBALD (shouldn't get here)
        return {};
    }

    var _output = {};

    // Instrument number is common to all XDATA types.
    _output['cobald_instrument_number'] = parseInt(xdata.substr(2,2),16);

    // Sonde number
    _output['cobald_sonde_number'] = parseInt(xdata.substr(4,3),16);

    // Internal temperature
    _internal_temperature = parseInt(xdata.substr(7,3),16);
    if ((_internal_temperature  & 0x800) > 0) {
        _internal_temperature  = _internal_temperature  - 0x1000;
    }
    _internal_temperature = _internal_temperature/8; // Degrees C (-40 - 50)
    _output['cobald_internal_temperature'] = Math.round(_internal_temperature * 100) / 100; // 2 DP

    // Blue backscatter
    _blue_backscatter = parseInt(xdata.substr(10,6),16);
    if ((_blue_backscatter  & 0x800000) > 0) {
        _blue_backscatter  = _blue_backscatter  - 0x1000000;
    }
    _output['cobald_blue_backscatter'] = _blue_backscatter; // (0 - 1000000)
    
    // Red backckatter
    _red_backscatter = parseInt(xdata.substr(16,6),16);
    if ((_red_backscatter  & 0x800000) > 0) {
        _red_backscatter  = _red_backscatter  - 0x1000000;
    }
    _output['cobald_red_backscatter'] = _red_backscatter; // (0 - 1000000)

    // Blue monitor
    _blue_monitor = parseInt(xdata.substr(22,4),16);
    if ((_blue_monitor  & 0x8000) > 0) {
        _blue_monitor  = _blue_monitor  - 0x10000;
    }
    _output['cobald_blue_monitor'] = _blue_monitor; // (-32768 - 32767)
    
    // Red monitor
    _red_monitor = parseInt(xdata.substr(26,4),16);
    if ((_red_monitor  & 0x8000) > 0) {
        _red_monitor  = _red_monitor  - 0x10000;
    }
    _output['cobald_red_monitor'] = _red_monitor; // (-32768 - 32767)

    return _output
}

function parseSKYDEW(xdata) {
    // Attempt to parse an XDATA string from a SKYDEW Peltier-based chilled-mirror hygrometer
    // Returns an object with parameters to be added to the sondes telemetry.
    //
    // References: 
    // https://www.gruan.org/gruan/editor/documents/meetings/icm-12/pres/pres_306_Sugidachi_SKYDEW.pdf
    //
    // Sample data:      3F0141DF73B940F600150F92FF27D5C8304102   (length = 38 characters)

    // Cast to string if not already
    xdata = String(xdata);

    // Run some checks over the input
    if(xdata.length != 38){
        // Invalid SKYDEW dataset
        return {};
    }

    if(xdata.substr(0,2) !== '3F'){
        // Not a SKYDEW (shouldn't get here)
        return {};
    }

    var _output = {};

    // Instrument number is common to all XDATA types.
    _output['skydew_instrument_number'] = parseInt(xdata.substr(2,2),16);

    // Other fields may include
    // Serial number
    // Mirror temperature (-120 - 30)
    // Mixing ratio V (ppmV)
    // PT100 (Ohm 60 - 120)
    // SCA light
    // SCA base
    // PLT current
    // HS temp
    // CB temp
    // PID
    // Battery
    return _output
}

function parseXDATA(data, pressure){
    // Accept an XDATA string, or multiple XDATA entries, delimited by '#'
    // Attempt to parse each one, and return an object
    // Test datasets:
    // "0501034F02C978A06300"
    // "0501R20234850000006EI"
    // "0501034F02CA08B06700#800261FCA6F80012F6F40A75"
    // "800262358C080012FE6C0A70#0501035902BA08908400"
    // "0501092C000000000000#190214f0df03e82e03660048d73683#0803DC5EF086C244078601A5#3F04475A4B0D415900160D510C270200465900"

    // Split apart any contatenated xdata.
    if(data.includes('#')){
        data_split = data.split('#');
    } else {
        data_split = [data];
    }

    _output = {"xdata_instrument": []};
    _instruments = [];
    for(xdata_i = 0; xdata_i < data_split.length; xdata_i++){
        _current_xdata = data_split[xdata_i];

        // Get Instrument ID
        // https://gml.noaa.gov/aftp/user/jordan/XDATA%20Instrument%20ID%20Allocation.pdf
        // https://www.gruan.org/gruan/editor/documents/gruan/GRUAN-TN-11_GruanToolRs92_v1.0_2020-10-01.pdf
        _instrument = _current_xdata.substr(0,2);

        if (_instrument === '01') {
            // V7
            // 0102 time=1001 cnt=0 rpm=0
            // 0102 time=1001 cnt=7 rpm=419
            if (!_instruments.includes("V7")) _instruments.push('V7');
        } else if (_instrument === '05'){
            // OIF411
            _xdata_temp = parseOIF411(_current_xdata, pressure);
            _output = Object.assign(_output,_xdata_temp);
            if (!_instruments.includes("OIF411")) _instruments.push('OIF411');
        } else if (_instrument === '08'){
            // CFH
            _xdata_temp = parseCFH(_current_xdata);
            _output = Object.assign(_output,_xdata_temp);
            if (!_instruments.includes("CFH")) _instruments.push('CFH');
        } else if (_instrument === '10'){
            // FPH
            if (!_instruments.includes("FPH")) _instruments.push('FPH');
        } else if (_instrument === '19'){
            // COBALD
            _xdata_temp = parseCOBALD(_current_xdata);
            _output = Object.assign(_output,_xdata_temp);
            if (!_instruments.includes("COBALD")) _instruments.push('COBALD');
        } else if (_instrument === '28'){
            // SLW
            if (!_instruments.includes("SLW")) _instruments.push('SLW');
        } else if (_instrument === '38'){
            // POPS
            if (!_instruments.includes("POPS")) _instruments.push('POPS');
        } else if (_instrument === '39'){
            // OPC
            if (!_instruments.includes("OPC")) _instruments.push('OPC');
        } else if (_instrument === '3C'){
            // PCFH
            // SRNO, H0, H1, F0, F1
            // 3c010000184b4b5754
            // 3c0103ce7b58647a98748befff
            // 3c010148719fff8e54b9af627e249fe0
            // 3c01028d696fff8db4b7865980cdbbb3
            if (!_instruments.includes("PCFH")) _instruments.push('PCFH');
        } else if (_instrument === '3D'){
            // FLASH-B
            if (!_instruments.includes("FLASH-B")) _instruments.push('FLASH-B');
        } else if (_instrument === '3E'){
            // TRAPS
            if (!_instruments.includes("TRAPS")) _instruments.push('TRAPS');
        } else if (_instrument === '3F'){
            // SKYDEW
            _xdata_temp = parseSKYDEW(_current_xdata);
            _output = Object.assign(_output,_xdata_temp);
            if (!_instruments.includes("SKYDEW")) _instruments.push('SKYDEW');
        } else if (_instrument === '41'){
            // CICANUM
            if (!_instruments.includes("CICANUM")) _instruments.push('CICANUM');
        } else if (_instrument === '45'){
            // POPS
            if (!_instruments.includes("POPS")) _instruments.push('POPS');
        } else if (_instrument === '80'){
            // Unknown!
            //console.log("Saw unknown XDATA instrument 0x80.")
        }else {
            // Unknown!

        }
    }

    if (_instrument.length > 0) _output["xdata_instrument"] = _instruments;

    return _output

}