"use strict";

/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, middleName, lastName, phone, notes }) {
    this.id = id;
    this.firstName = firstName;
    this.middleName = middleName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
    this.fullName = this.fullName();
  }

  /* Return full name of customer */

  fullName() {
    if (this.middleName) {
      return `${this.firstName} ${this.middleName} ${this.lastName}`;
    }
    return `${this.firstName} ${this.lastName}`;
  }

  /** find all customers. */

  static async all() {
    const results = await db.query(
      `SELECT id,
                  first_name AS "firstName",
                  middle_name AS "middleName",
                  last_name  AS "lastName",
                  phone,
                  notes
           FROM customers
           ORDER BY last_name, first_name`,
    );
    let customers = results.rows.map(c => new Customer(c));

    return await Customer._setRecentRes(customers);
  }

  /** get a customer by ID. */

  static async get(id) {
    const results = await db.query(
      `SELECT id,
                  first_name AS "firstName",
                  middle_name AS "middleName",
                  last_name  AS "lastName",
                  phone,
                  notes
           FROM customers
           WHERE id = $1`,
      [id],
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }

  /** Search users by the term */

  static async search(term) {
    let portion = `%${term}%`;

    const results = await db.query(
      `SELECT id,
              first_name AS "firstName",
              middle_name AS "middleName",
              last_name  AS "lastName",
              phone,
              notes
      FROM customers
      WHERE first_name ILIKE $1
        OR middle_name ILIKE $1
        OR last_name ILIKE $1`,
      [portion],
    );

    let customers = results.rows.map(c => new Customer(c));

    return await Customer._setRecentRes(customers);
  }

  /** Get the top 10 customers with most reservations */

  static async topTen() {
    const results = await db.query(
      `SELECT customers.id,
                first_name AS "firstName",
                middle_name AS "middleName",
                last_name  AS "lastName",
                phone,
                customers.notes
        FROM customers
          JOIN reservations ON customers.id = reservations.customer_id
          GROUP BY customers.id
        ORDER BY count(*) DESC
        LIMIT 10`);

    let customers = results.rows.map(c => new Customer(c));

    return await Customer._setRecentRes(customers);
  }

  /** Static method to set most recent reservation of customers */

  static async _setRecentRes(customers) {
    
    for(let customer of customers) {
      customer.mostRecent = await customer.getRecentReservation();
    }

    return customers;
  }

  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  /** Returns the most recent reservation for the user */

  async getRecentReservation() {
    const results = await db.query(
      `SELECT id,
              customer_id AS "customerId",
              num_guests AS "numGuests",
              start_at AS "startAt",
              notes AS "notes"
       FROM reservations
       WHERE customer_id = $1
       ORDER BY start_at DESC
       LIMIT 1`,
      [this.id],
    );
    let reservation = results.rows[0];

    if (reservation === undefined) {
      return false;
    }

    return new Reservation(reservation);
  }

  /** save this customer. */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, middle_name, last_name, phone, notes)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
        [this.firstName, this.middleName, this.lastName, this.phone, this.notes],
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers
             SET first_name=$1,
                 middle_name=$2,
                 last_name=$3,
                 phone=$4,
                 notes=$5
             WHERE id = $6`, [
        this.firstName,
        this.middleName,
        this.lastName,
        this.phone,
        this.notes,
        this.id,
      ],
      );
    }
  }


}

module.exports = Customer;
