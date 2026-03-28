import chalk from "chalk";
import { Fbo } from "onair-api";

import { cliTable } from "../utils/cli-table";

export const logCompanyFbos = (companyFbos: Fbo[]): void => {
  const fboTable = cliTable();
  const formatFuel = (quantity: number, capacity: number): string => {
    return `${Math.floor(quantity)}/${Math.floor(capacity)}`;
  };

  fboTable.push([
    chalk.green('Airport'),
    chalk.green('Name'),
    chalk.green('100LL'),
    chalk.green('Sell'),
    chalk.green('Jet'),
    chalk.green('Sell'),
    chalk.green('C'),
    chalk.green('S'),
    chalk.green('T'),
    chalk.green('H')
  ]);

  companyFbos.forEach((Fbo) => {
    fboTable.push([
      Fbo.Airport.ICAO,
      Fbo.Name,
      formatFuel(Fbo.Fuel100LLQuantity, Fbo.Fuel100LLCapacity),
      Fbo.AllowFuel100LLSelling ? `✅ ${Fbo.Fuel100LLSellPrice}` : '❌',
      formatFuel(Fbo.FuelJetQuantity, Fbo.FuelJetCapacity),
      Fbo.AllowFuelJetSelling ? `✅ ${Fbo.FuelJetSellPrice}` : '❌',
      Fbo.CargoWeightCapacity,
      Fbo.SleepingCapacity,
      Fbo.AircraftTieDownCapacity,
      Fbo.AircraftHangarCapacity
    ])
  });

  console.log(fboTable.toString());

  console.log(
    chalk.whiteBright.bold('\nKey ') +
    chalk.green('C') +
    ' Cargo capacity  ' +
    chalk.green('S') +
    ' Sleeping  ' +
    chalk.green('T') +
    ' Tiedowns  ' +
    chalk.green('H') +
    ' Hanger'
  );
}
