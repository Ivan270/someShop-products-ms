import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {PrismaClient} from '@prisma/client';
import {CreateProductDto} from './dto/create-product.dto';
import {UpdateProductDto} from './dto/update-product.dto';
import {PaginationDto} from "../common";
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {

    private readonly logger = new Logger('ProductsService')

    async onModuleInit() {
        await this.$connect(); // conexión a la base de datos con Prisma
        this.logger.log('Connected to database');
    }

    create(createProductDto: CreateProductDto) {

        return this.product.create({
            data: createProductDto,
        })
    }

    async findAll(paginationDto: PaginationDto) {
        const {page, limit} = paginationDto;

        // Para saber el total de paginas
        const totalProducts = await this.product.count({
            where: {
                available: true
            }
        })
        const totalPages = Math.ceil(totalProducts / limit)

        // Si página indicada es superior a la cantidad de páginas
        // se devuelve la última página disponible
        if (page > totalPages) {
            return {
                data: await this.product.findMany({
                    skip: (totalPages - 1) * limit,
                    take: limit,
                    where: {
                        available: true
                    }
                }),
                metadata: {
                    total: totalProducts,
                    page: totalPages,
                    lastPage: totalPages,
                }
            }
        }

        return {
            data: await this.product.findMany({
                skip: (page - 1) * limit,
                take: limit,
                where: {
                    available: true
                }
            }),
            metadata: {
                total: totalProducts,
                page: page,
                lastPage: totalPages,

            }
        }
    }

    async findOne(id: number) {
        const product = await this.product.findUnique({
            where: {
                id,
                available: true
            }
        });
        // Entregar objeto detallado para manejar el error en client-gateway
        if (!product) {
            throw new RpcException({
                message: `Product with id ${id} not found`,
                status: HttpStatus.BAD_REQUEST
        });
        }
        return product;
    }

    async update(id: number, updateProductDto: UpdateProductDto) {

        // Se le cambia el nombre al id (a __) para que no choque con lo que ya viene en payload, resto de los datos
        // estarán dentro del objeto data
        const {id: __, ...data} = updateProductDto;

        // Primero evaluar existencia del producto
        await this.findOne(id)

        return this.product.update({
            data: data,
            where: {id}
        });
    }

    // HARD DELETE, puede ocasionar problemas de integridad referencial
    // async remove(id: number) {
    //     await this.findOne(id)
    //
    //     return this.product.delete({
    //         where: {id}
    //     })
    //
    // }
    async remove(id: number) {
        await this.findOne(id)

        const product = await this.product.update({
            where: {id},
            data: {
                available: false
            }
        })

        return product;
    }

    async validateProducts(ids: number[]){
    //     Es necesario eliminar ids duplicados que vengan en el array
        ids = Array.from(new Set(ids))
        const products = await this.product.findMany({
            where: {
                id: {
                    // Solo traerá los ids encontrados
                    in: ids
                }
            }
        })

    //     validar que todos los ids estén disponibles
        if(products.length !== ids.length){
            throw new RpcException({
                message: `Some products were not found`,
                status: HttpStatus.BAD_REQUEST
            })
        }

        return products;
    }
}
