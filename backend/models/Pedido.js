class Pedido {
  constructor({ id, nombre_cliente, apellido_cliente, correo_cliente, telefono_cliente, nombre_producto, precio_producto, metodo_pago, fecha_compra, referencia_pago, estado_pago }) {
    this.id = id || null;
    this.nombre_cliente = nombre_cliente;
    this.apellido_cliente = apellido_cliente;
    this.correo_cliente = correo_cliente;
    this.telefono_cliente = telefono_cliente;
    this.nombre_producto = nombre_producto;
    this.precio_producto = precio_producto;
    this.metodo_pago = metodo_pago || 'No especificado';
    this.fecha_compra = fecha_compra || new Date();
    this.referencia_pago = referencia_pago || null;
    this.estado_pago = estado_pago || 'PENDING';
  }

  // Método estático para validar que todos los campos requeridos existan
  static validate(data) {
    const required = ['nombre_cliente', 'apellido_cliente', 'correo_cliente', 'telefono_cliente', 'nombre_producto', 'precio_producto'];
    for (let field of required) {
      if (!data[field]) {
        throw new Error(`El campo ${field} es requerido.`);
      }
    }
  }
}

module.exports = Pedido;
