import React, { Component } from 'react';
import Gauge from 'react-svg-gauge';

export class ProtoGuage extends React.Component {
    
    render() {
        return (
            <div>
                <Gauge value={50} width={150} height={125} label="Proto Guage" />
            </div>
        );
    }
};